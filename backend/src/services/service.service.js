import Service from "../models/Service.js";
import { ensure } from "../utils/appError.js";
import { buildPagination } from "../utils/response.js";
import { deleteImageKitFile } from "./imagekit.service.js";
import {
  assertNotBlockedByModeration,
  createModerationEvent,
  publicModerationClause,
  scanListingModeration,
  toModerationState,
} from "./moderation.service.js";

const ALLOWED_SORTS = new Set([
  "-stats.averageRating",
  "stats.averageRating",
  "-createdAt",
  "createdAt",
  "-stats.views",
  "stats.views",
]);

export const listServices = async (query) => {
  const { q, category, maxPrice, minPrice, sort, page, limit } = query;

  const safeSort = ALLOWED_SORTS.has(sort || "")
    ? sort
    : "-stats.averageRating";
  const filter = { status: "active", ...publicModerationClause };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (typeof maxPrice === "number") {
    filter["pricing.0.price"] = {
      ...(filter["pricing.0.price"] || {}),
      $lte: maxPrice,
    };
  }
  if (typeof minPrice === "number") {
    filter["pricing.0.price"] = {
      ...(filter["pricing.0.price"] || {}),
      $gte: minPrice,
    };
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Service.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limit)
      .populate(
        "seller",
        "fullName username avatar isVerifiedBadge averageRating",
      )
      .lean(),
    Service.countDocuments(filter),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

export const getMyServices = async (userId) => {
  return Service.find({ seller: userId }).sort("-createdAt").lean();
};

export const getServiceBySlug = async (slug) => {
  const service = await Service.findOne({ slug, ...publicModerationClause })
    .populate(
      "seller",
      "fullName username avatar isVerifiedBadge averageRating reviewCount availabilityStatus",
    )
    .lean();

  ensure(service, "Service not found", 404);

  Service.findByIdAndUpdate(service._id, {
    $inc: { "stats.views": 1 },
  }).catch(() => {});

  return service;
};

export const createService = async (userId, payload) => {
  const scan = scanListingModeration({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    tags: payload.tags,
    pricing: payload.pricing,
    faqs: payload.faqs,
  });

  assertNotBlockedByModeration(scan, "service");

  const service = await Service.create({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    pricing: payload.pricing ?? [],
    tags: payload.tags ?? [],
    faqs: payload.faqs ?? [],
    seller: userId,
    moderation: toModerationState(scan),
  });

  if (scan.decision === "review") {
    await createModerationEvent({
      entityType: "service",
      entityId: service._id,
      contentOwner: userId,
      origin: "system",
      action: "flagged",
      severity: scan.severity,
      score: scan.score,
      reasons: scan.reasons,
      snapshot: {
        title: service.title,
        category: service.category,
        excerpt: service.description,
      },
      note: "Automatically flagged by service moderation checks",
      status: "open",
    });
  }

  return service;
};

export const updateService = async (userId, id, patch) => {
  const service = await Service.findOne({ _id: id, seller: userId });
  ensure(service, "Not found or unauthorized", 404);

  const normalizedPatch = { ...patch };

  if (typeof normalizedPatch.pricing === "string") {
    try {
      normalizedPatch.pricing = JSON.parse(normalizedPatch.pricing);
    } catch {
      normalizedPatch.pricing = service.pricing;
    }
  }

  if (typeof normalizedPatch.tags === "string") {
    try {
      normalizedPatch.tags = JSON.parse(normalizedPatch.tags);
    } catch {
      normalizedPatch.tags = service.tags;
    }
  }

  if (typeof normalizedPatch.faqs === "string") {
    try {
      normalizedPatch.faqs = JSON.parse(normalizedPatch.faqs);
    } catch {
      normalizedPatch.faqs = service.faqs;
    }
  }

  const scan = scanListingModeration({
    title: normalizedPatch.title ?? service.title,
    description: normalizedPatch.description ?? service.description,
    category: normalizedPatch.category ?? service.category,
    tags: normalizedPatch.tags ?? service.tags,
    pricing: normalizedPatch.pricing ?? service.pricing,
    faqs: normalizedPatch.faqs ?? service.faqs,
  });

  assertNotBlockedByModeration(scan, "service update");

  Object.assign(service, normalizedPatch);
  service.moderation = toModerationState(scan);
  await service.save();

  if (scan.decision === "review") {
    await createModerationEvent({
      entityType: "service",
      entityId: service._id,
      contentOwner: userId,
      origin: "system",
      action: "flagged",
      severity: scan.severity,
      score: scan.score,
      reasons: scan.reasons,
      snapshot: {
        title: service.title,
        category: service.category,
        excerpt: service.description,
      },
      note: "Automatically flagged after service update",
      status: "open",
    });
  }

  return service;
};

export const deleteService = async (userId, id) => {
  const service = await Service.findOneAndDelete({ _id: id, seller: userId });
  ensure(service, "Not found or unauthorized", 404);

  const fileIds =
    service?.gallery
      ?.map((entry) => entry?.fileId)
      .filter(Boolean)
      .slice(0, 30) || [];

  if (fileIds.length) {
    Promise.allSettled(
      fileIds.map((fileId) => deleteImageKitFile(fileId)),
    ).catch(() => {});
  }

  return null;
};
