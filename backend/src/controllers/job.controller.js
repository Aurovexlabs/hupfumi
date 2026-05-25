import { z } from "zod";
import {
  applyToJob,
  createJob,
  deleteJob,
  getApplicationsForJob,
  getJobBySlug,
  getMyApplications,
  getMyJobs,
  listJobs,
  updateApplicationStatus,
  updateJob,
} from "../services/job.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok, paginated } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listJobsQuerySchema = z.object({
  q: z.string().trim().max(160).optional(),
  category: z.string().trim().max(80).optional(),
  jobType: z.enum(["fixed", "hourly"]).optional(),
  minBudget: z.coerce.number().min(0).optional(),
  maxBudget: z.coerce.number().min(0).optional(),
  location: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().optional(),
  featured: z.enum(["true", "false"]).optional(),
});

const createJobSchema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(5000),
  category: z.string().trim().min(2).max(80),
  jobType: z.enum(["fixed", "hourly"]),
  budget: z.any().optional(),
  skills: z.any().optional(),
  deadline: z.any().optional(),
  location: z.any().optional(),
});

const updateJobSchema = z
  .object({
    title: z.string().trim().min(5).max(140).optional(),
    description: z.string().trim().min(20).max(5000).optional(),
    category: z.string().trim().min(2).max(80).optional(),
    jobType: z.enum(["fixed", "hourly"]).optional(),
    budget: z.any().optional(),
    skills: z.any().optional(),
    deadline: z.any().optional(),
    location: z.any().optional(),
    status: z
      .enum(["open", "in_progress", "completed", "closed", "cancelled"])
      .optional(),
    featured: z.boolean().optional(),
    featuredUntil: z.any().optional(),
  })
  .strict();

const applySchema = z.object({
  coverLetter: z.string().trim().min(20).max(4000),
  proposedBudget: z.coerce.number().min(1),
  proposedTimeline: z.string().trim().min(2).max(120),
});

const applicationStatusSchema = z.object({
  status: z.enum([
    "pending",
    "reviewed",
    "shortlisted",
    "accepted",
    "rejected",
    "withdrawn",
  ]),
});

export const getJobs = async (req, res) => {
  try {
    const parsed = listJobsQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid search query", 400);

    const result = await listJobs(parsed.data);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMyJobsList = async (req, res) => {
  try {
    const jobs = await getMyJobs(req.user._id);
    return ok(res, jobs);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMyApplicationsList = async (req, res) => {
  try {
    const apps = await getMyApplications(req.user._id);
    return ok(res, apps);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getJob = async (req, res) => {
  try {
    const job = await getJobBySlug(req.params.slug);
    return ok(res, job);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postJob = async (req, res) => {
  try {
    const parsed = createJobSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid job payload", 400);

    const job = await createJob(req.user._id, parsed.data);
    return ok(res, job, "Job posted", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchJob = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid job id", 400);

    const bodyParsed = updateJobSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid job update payload", 400);

    if (Object.keys(bodyParsed.data).length === 0) {
      return fail(res, "No valid fields to update", 400);
    }

    const job = await updateJob(req.user._id, idParsed.data, bodyParsed.data);
    return ok(res, job, "Job updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const removeJob = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid job id", 400);

    await deleteJob(req.user._id, parsed.data);
    return ok(res, null, "Job deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getApplications = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid job id", 400);

    const apps = await getApplicationsForJob(req.user, parsed.data);
    return ok(res, apps);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const apply = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid job id", 400);

    const bodyParsed = applySchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Cover letter, budget, and timeline required", 400);

    const app = await applyToJob(req.user._id, idParsed.data, bodyParsed.data);
    return ok(res, app, "Application submitted", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchApplication = async (req, res) => {
  try {
    const jobParsed = objectIdSchema.safeParse(req.params.jobId);
    const appParsed = objectIdSchema.safeParse(req.params.appId);
    if (!jobParsed.success || !appParsed.success)
      return fail(res, "Invalid id", 400);

    const bodyParsed = applicationStatusSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid application status payload", 400);

    const app = await updateApplicationStatus(
      req.user._id,
      jobParsed.data,
      appParsed.data,
      bodyParsed.data.status,
    );

    return ok(res, app, "Application updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
