import SavedItem from "../models/SavedItem.js";
import { AppError, ensure } from "../utils/appError.js";

const MODEL_MAP = {
  job: "Job",
  service: "Service",
  product: "Product",
};

export const listSavedItems = async (userId, query) => {
  const { type, page, limit } = query;

  const filter = { user: userId };
  if (type) filter.refType = type;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    SavedItem.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
    SavedItem.countDocuments(filter),
  ]);

  return {
    items,
    total,
    page,
  };
};

export const isSaved = async (userId, refType, refId) => {
  const saved = await SavedItem.exists({ user: userId, refType, refId });
  return { saved: Boolean(saved) };
};

export const toggleSavedItem = async (userId, payload) => {
  const { refType, refId } = payload;
  const modelName = MODEL_MAP[refType];

  if (!modelName) {
    throw new AppError("Invalid refType", 400);
  }

  const existing = await SavedItem.findOne({ user: userId, refType, refId });
  if (existing) {
    await existing.deleteOne();
    return { saved: false, message: "Removed from saved" };
  }

  const { default: Model } = await import(`../models/${modelName}.js`);
  const item = await Model.findById(refId)
    .select("title slug price pricing images gallery")
    .lean();

  ensure(item, "Item not found", 404);

  await SavedItem.create({
    user: userId,
    refType,
    refId,
    title: item.title,
    slug: item.slug,
    price: item.price ?? item.pricing?.[0]?.price ?? null,
    image: item.images?.[0]?.url ?? item.gallery?.[0]?.url ?? null,
  });

  return { saved: true, message: "Saved" };
};
