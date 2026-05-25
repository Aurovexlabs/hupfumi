import Product from "../models/Product.js";
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
  "-createdAt",
  "createdAt",
  "-price",
  "price",
  "-stats.sales",
  "stats.sales",
  "-stats.views",
  "stats.views",
]);

export const listProducts = async (query) => {
  const { q, category, condition, maxPrice, minPrice, sort, page, limit } =
    query;

  const safeSort = ALLOWED_SORTS.has(sort || "") ? sort : "-createdAt";
  const filter = { status: "active", ...publicModerationClause };

  if (q) filter.$text = { $search: q };
  if (category) filter.category = category;
  if (condition) filter.condition = condition;
  if (typeof maxPrice === "number") {
    filter.price = { ...(filter.price || {}), $lte: maxPrice };
  }
  if (typeof minPrice === "number") {
    filter.price = { ...(filter.price || {}), $gte: minPrice };
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    Product.find(filter)
      .sort(safeSort)
      .skip(skip)
      .limit(limit)
      .populate("seller", "fullName username avatar isVerifiedBadge")
      .lean(),
    Product.countDocuments(filter),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};

export const getMyProducts = async (userId) => {
  return Product.find({ seller: userId }).sort("-createdAt").lean();
};

export const getProductBySlug = async (slug) => {
  const product = await Product.findOne({ slug, ...publicModerationClause })
    .populate(
      "seller",
      "fullName username avatar isVerifiedBadge averageRating reviewCount",
    )
    .lean();

  ensure(product, "Product not found", 404);

  Product.findByIdAndUpdate(product._id, {
    $inc: { "stats.views": 1 },
  }).catch(() => {});

  return product;
};

export const createProduct = async (userId, payload) => {
  const scan = scanListingModeration({
    title: payload.title,
    description: payload.description,
    category: payload.category,
  });

  assertNotBlockedByModeration(scan, "product");

  const product = await Product.create({
    title: payload.title,
    description: payload.description,
    category: payload.category,
    price: payload.price,
    condition: payload.condition || "new",
    inventory: payload.inventory || { quantity: 0 },
    discount: payload.discount,
    location: payload.location,
    seller: userId,
    moderation: toModerationState(scan),
  });

  if (scan.decision === "review") {
    await createModerationEvent({
      entityType: "product",
      entityId: product._id,
      contentOwner: userId,
      origin: "system",
      action: "flagged",
      severity: scan.severity,
      score: scan.score,
      reasons: scan.reasons,
      snapshot: {
        title: product.title,
        category: product.category,
        excerpt: product.description,
      },
      note: "Automatically flagged by product moderation checks",
      status: "open",
    });
  }

  return product;
};

export const updateProduct = async (userId, id, patch) => {
  const product = await Product.findOne({ _id: id, seller: userId });
  ensure(product, "Not found or unauthorized", 404);

  const scan = scanListingModeration({
    title: patch.title ?? product.title,
    description: patch.description ?? product.description,
    category: patch.category ?? product.category,
  });

  assertNotBlockedByModeration(scan, "product update");

  Object.assign(product, patch);
  product.moderation = toModerationState(scan);
  await product.save();

  if (scan.decision === "review") {
    await createModerationEvent({
      entityType: "product",
      entityId: product._id,
      contentOwner: userId,
      origin: "system",
      action: "flagged",
      severity: scan.severity,
      score: scan.score,
      reasons: scan.reasons,
      snapshot: {
        title: product.title,
        category: product.category,
        excerpt: product.description,
      },
      note: "Automatically flagged after product update",
      status: "open",
    });
  }

  return product;
};

export const deleteProduct = async (userId, id) => {
  const product = await Product.findOneAndDelete({ _id: id, seller: userId });
  ensure(product, "Not found or unauthorized", 404);

  const fileIds =
    product?.images
      ?.map((image) => image?.fileId)
      .filter(Boolean)
      .slice(0, 30) || [];

  if (fileIds.length) {
    Promise.allSettled(
      fileIds.map((fileId) => deleteImageKitFile(fileId)),
    ).catch(() => {});
  }

  return null;
};
