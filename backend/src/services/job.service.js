import Application from "../models/Application.js";
import Job from "../models/Job.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import { AppError, ensure } from "../utils/appError.js";
import { buildPagination } from "../utils/response.js";
import {
  assertNotBlockedByModeration,
  createModerationEvent,
  publicModerationClause,
  scanListingModeration,
  toModerationState,
} from "./moderation.service.js";

const ALLOWED_SORTS = new Set([
  "-createdAt",
  "createdAt",
  "-budget.max",
  "budget.max",
  "-applicantsCount",
  "applicantsCount",
  "-views",
  "views",
]);

export const listJobs = async (query) => {
  const {
    q,
    category,
    jobType,
    minBudget,
    maxBudget,
    location,
    page,
    limit,
    sort,
    featured,
  } = query;

  const safeSort = ALLOWED_SORTS.has(sort || "") ? sort : "-createdAt";
  const filter = { status: "open", ...publicModerationClause };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (jobType) filter.jobType = jobType;
  if (typeof minBudget === "number") filter["budget.max"] = { $gte: minBudget };
  if (typeof maxBudget === "number") filter["budget.min"] = { $lte: maxBudget };
  if (location) filter["location.city"] = new RegExp(location, "i");
  if (featured === "true") filter.featured = true;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Job.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limit)
      .populate(
        "employer",
        "fullName username avatar isVerifiedBadge averageRating reviewCount",
      )
      .lean(),
    Job.countDocuments(filter),
  ]);

  if (q) {
    SearchAnalytics.findOneAndUpdate(
      { term: q.toLowerCase().trim() },
      { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
      { upsert: true },
    ).catch(() => {});
  }

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

export const getMyJobs = async (userId) => {
  return Job.find({ employer: userId }).sort("-createdAt").lean();
};

export const getMyApplications = async (userId) => {
  return Application.find({ applicant: userId })
    .sort("-createdAt")
    .populate("job", "title slug budget jobType status")
    .lean();
};

export const getJobBySlug = async (slug) => {
  const job = await Job.findOne({ slug, ...publicModerationClause })
    .populate(
      "employer",
      "fullName username avatar isVerifiedBadge averageRating reviewCount",
    )
    .lean();

  ensure(job, "Job not found", 404);

  Job.findByIdAndUpdate(job._id, { $inc: { views: 1 } }).catch(() => {});

  return job;
};

export const createJob = async (userId, payload) => {
  let normalizedBudget = payload.budget;
  let normalizedSkills = payload.skills ?? [];

  if (typeof payload.budget === "string") {
    try {
      normalizedBudget = JSON.parse(payload.budget);
    } catch {
      throw new AppError("Invalid budget format", 400);
    }
  }

  if (typeof payload.skills === "string") {
    try {
      normalizedSkills = JSON.parse(payload.skills);
    } catch {
      throw new AppError("Invalid skills format", 400);
    }
  }

  const scan = scanListingModeration({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    skills: normalizedSkills,
  });

  assertNotBlockedByModeration(scan, "job");

  const moderation = toModerationState(scan);

  const job = await Job.create({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    jobType: payload.jobType,
    budget: normalizedBudget,
    skills: normalizedSkills,
    deadline: payload.deadline,
    location: payload.location,
    employer: userId,
    moderation,
  });

  if (scan.decision === "review") {
    await createModerationEvent({
      entityType: "job",
      entityId: job._id,
      contentOwner: userId,
      origin: "system",
      action: "flagged",
      severity: scan.severity,
      score: scan.score,
      reasons: scan.reasons,
      snapshot: {
        title: job.title,
        category: job.category,
        excerpt: job.description,
      },
      note: "Automatically flagged by listing moderation checks",
      status: "open",
    });
  }

  return job;
};

export const updateJob = async (userId, id, patch) => {
  const job = await Job.findOne({ _id: id, employer: userId });
  ensure(job, "Not found or unauthorized", 404);

  const normalizedPatch = { ...patch };

  if (typeof normalizedPatch.budget === "string") {
    try {
      normalizedPatch.budget = JSON.parse(normalizedPatch.budget);
    } catch {
      throw new AppError("Invalid budget format", 400);
    }
  }

  if (typeof normalizedPatch.skills === "string") {
    try {
      normalizedPatch.skills = JSON.parse(normalizedPatch.skills);
    } catch {
      throw new AppError("Invalid skills format", 400);
    }
  }

  const scan = scanListingModeration({
    title: normalizedPatch.title ?? job.title,
    description: normalizedPatch.description ?? job.description,
    category: normalizedPatch.category ?? job.category,
    skills: normalizedPatch.skills ?? job.skills,
  });

  assertNotBlockedByModeration(scan, "job update");

  Object.assign(job, normalizedPatch);
  job.moderation = toModerationState(scan);
  await job.save();

  if (scan.decision === "review") {
    await createModerationEvent({
      entityType: "job",
      entityId: job._id,
      contentOwner: userId,
      origin: "system",
      action: "flagged",
      severity: scan.severity,
      score: scan.score,
      reasons: scan.reasons,
      snapshot: {
        title: job.title,
        category: job.category,
        excerpt: job.description,
      },
      note: "Automatically flagged after job update",
      status: "open",
    });
  }

  return job;
};

export const deleteJob = async (userId, id) => {
  const job = await Job.findOneAndDelete({ _id: id, employer: userId });
  ensure(job, "Not found or unauthorized", 404);
  return null;
};

export const getApplicationsForJob = async (viewer, jobId) => {
  const job = await Job.findById(jobId);
  ensure(job, "Job not found", 404);

  const isOwner = String(job.employer) === String(viewer._id);
  const isAdmin = ["admin", "superadmin"].includes(viewer.role);
  ensure(isOwner || isAdmin, "Forbidden", 403);

  return Application.find({ job: jobId })
    .sort("-createdAt")
    .populate(
      "applicant",
      "fullName username avatar averageRating reviewCount isVerifiedBadge",
    )
    .lean();
};

export const applyToJob = async (userId, jobId, payload) => {
  const job = await Job.findById(jobId);
  ensure(job, "Job not found", 404);
  ensure(
    (job.moderation?.status || "approved") === "approved",
    "This job is not available for applications",
    400,
  );
  ensure(
    String(job.employer) !== String(userId),
    "You cannot apply to your own job",
    400,
  );
  ensure(job.status === "open", "Job is not accepting applications", 400);

  const existing = await Application.findOne({ job: jobId, applicant: userId });
  ensure(!existing, "You have already applied", 400);

  let app;
  try {
    app = await Application.create({
      job: jobId,
      applicant: userId,
      coverLetter: payload.coverLetter,
      proposedBudget: payload.proposedBudget,
      proposedTimeline: payload.proposedTimeline,
    });
  } catch (error) {
    if (error?.code === 11000) {
      throw new AppError("You have already applied", 400);
    }
    throw error;
  }

  await Job.findByIdAndUpdate(jobId, { $inc: { applicantsCount: 1 } });

  return app;
};

export const updateApplicationStatus = async (userId, jobId, appId, status) => {
  const job = await Job.findOne({ _id: jobId, employer: userId });
  ensure(job, "Not authorized", 403);

  const app = await Application.findOneAndUpdate(
    { _id: appId, job: jobId },
    { $set: { status } },
    { new: true },
  ).populate("applicant", "fullName username avatar");

  ensure(app, "Application not found", 404);
  return app;
};
