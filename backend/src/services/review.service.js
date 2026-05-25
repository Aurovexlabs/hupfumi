import mongoose from "mongoose";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { ensure } from "../utils/appError.js";
import { buildPagination } from "../utils/response.js";

const REVIEW_SORT_MAP = {
  newest: "-createdAt",
  highest: "-rating -createdAt",
  lowest: "rating -createdAt",
  helpful: "-helpfulCount -createdAt",
};

const clampInt = (value, fallback, min, max) => {
  const n = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

const sanitizeReviewComment = (comment) => String(comment || "").trim();

const normalizeListOptions = (options = {}) => {
  const sort =
    typeof options.sort === "string" && REVIEW_SORT_MAP[options.sort]
      ? options.sort
      : "newest";

  const rating = options.rating ? clampInt(options.rating, 0, 1, 5) : 0;

  return {
    page: clampInt(options.page, 1, 1, 10000),
    limit: clampInt(options.limit, 20, 1, 50),
    sort,
    rating,
  };
};

const aggregateSummary = async (refType, refId) => {
  const [summary] = await Review.aggregate([
    {
      $match: {
        refType,
        refId: new mongoose.Types.ObjectId(refId),
        isVisible: true,
      },
    },
    {
      $group: {
        _id: null,
        avg: { $avg: "$rating" },
        total: { $sum: 1 },
        r1: { $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] } },
        r2: { $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] } },
        r3: { $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] } },
        r4: { $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] } },
        r5: { $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] } },
      },
    },
  ]);

  if (!summary) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
    };
  }

  return {
    totalReviews: summary.total,
    averageRating: Math.round(Number(summary.avg || 0) * 10) / 10,
    ratingBreakdown: {
      1: summary.r1 || 0,
      2: summary.r2 || 0,
      3: summary.r3 || 0,
      4: summary.r4 || 0,
      5: summary.r5 || 0,
    },
  };
};

const refreshRatingSnapshots = async (revieweeId, refType, refId) => {
  const [sellerAgg] = await Review.aggregate([
    {
      $match: {
        reviewee: new mongoose.Types.ObjectId(revieweeId),
        isVisible: true,
      },
    },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  await User.findByIdAndUpdate(revieweeId, {
    averageRating: sellerAgg
      ? Math.round(Number(sellerAgg.avg || 0) * 10) / 10
      : 0,
    reviewCount: sellerAgg ? sellerAgg.count : 0,
  });

  if (!refType || !refId) return;
  if (!mongoose.Types.ObjectId.isValid(String(refId))) return;

  const [listingAgg] = await Review.aggregate([
    {
      $match: {
        refType,
        refId: new mongoose.Types.ObjectId(refId),
        isVisible: true,
      },
    },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);

  const listingStats = {
    "stats.averageRating": listingAgg
      ? Math.round(Number(listingAgg.avg || 0) * 10) / 10
      : 0,
    "stats.reviewCount": listingAgg ? listingAgg.count : 0,
  };

  if (refType === "service") {
    await Service.findByIdAndUpdate(refId, { $set: listingStats });
  } else if (refType === "product") {
    await Product.findByIdAndUpdate(refId, { $set: listingStats });
  }
};

export const listReviews = async (
  refType,
  refId,
  options = {},
  viewerId = null,
) => {
  const normalized = normalizeListOptions(options);
  const skip = (normalized.page - 1) * normalized.limit;

  const filter = { refId, refType, isVisible: true };
  if (normalized.rating) filter.rating = normalized.rating;

  const sortBy = REVIEW_SORT_MAP[normalized.sort] || REVIEW_SORT_MAP.newest;

  const query = Review.find(filter)
    .sort(sortBy)
    .skip(skip)
    .limit(normalized.limit)
    .populate("reviewer", "fullName username avatar")
    .populate("response.responder", "fullName username avatar");

  if (viewerId) query.select("+helpfulBy");

  const [total, summary, docs] = await Promise.all([
    Review.countDocuments(filter),
    aggregateSummary(refType, refId),
    query.lean(),
  ]);

  const viewer = viewerId ? String(viewerId) : "";
  const items = docs.map((review) => {
    const helpfulBy = Array.isArray(review.helpfulBy)
      ? review.helpfulBy.map((id) => String(id))
      : [];

    const { helpfulBy: _hidden, ...safeReview } = review;
    return {
      ...safeReview,
      isHelpful: viewer ? helpfulBy.includes(viewer) : false,
    };
  });

  return {
    items,
    summary,
    pagination: buildPagination(normalized.page, normalized.limit, total),
  };
};

export const createReview = async (userId, payload) => {
  const { orderId, rating, comment } = payload;

  const order = await Order.findOne({
    _id: orderId,
    buyer: userId,
    status: "completed",
  });
  ensure(order, "Order not found or not completed", 404);
  ensure(order.seller, "Order has no seller to review", 400);

  const existing = await Review.findOne({ order: orderId });
  ensure(!existing, "Already reviewed", 400);

  const cleanComment = sanitizeReviewComment(comment);
  ensure(
    cleanComment.length >= 10,
    "Review must be at least 10 characters",
    400,
  );

  const refId = order.service || order.product || order.job;
  const review = await Review.create({
    order: orderId,
    reviewer: userId,
    reviewee: order.seller,
    refType: order.orderType,
    refId,
    rating: Number(rating),
    comment: cleanComment,
  });

  if (!order.review) {
    order.review = review._id;
    await order.save();
  }

  await refreshRatingSnapshots(order.seller, order.orderType, refId);

  return Review.findById(review._id)
    .populate("reviewer", "fullName username avatar")
    .lean();
};

export const updateReview = async (userId, reviewId, payload) => {
  const review = await Review.findById(reviewId);
  ensure(review && review.isVisible, "Review not found", 404);
  ensure(
    String(review.reviewer) === String(userId),
    "Only the review author can edit this review",
    403,
  );

  const nextRating =
    payload.rating == null ? review.rating : Number(payload.rating);
  const nextComment =
    payload.comment == null
      ? review.comment
      : sanitizeReviewComment(payload.comment);

  ensure(Number.isFinite(nextRating), "Rating must be a number", 400);
  ensure(
    nextRating >= 1 && nextRating <= 5,
    "Rating must be between 1 and 5",
    400,
  );
  ensure(
    nextComment.length >= 10,
    "Review must be at least 10 characters",
    400,
  );

  const changed =
    review.rating !== nextRating || review.comment !== nextComment;
  ensure(changed, "No review changes submitted", 400);

  review.rating = nextRating;
  review.comment = nextComment;
  review.editedAt = new Date();
  await review.save();

  await refreshRatingSnapshots(review.reviewee, review.refType, review.refId);

  return Review.findById(review._id)
    .populate("reviewer", "fullName username avatar")
    .populate("response.responder", "fullName username avatar")
    .lean();
};

export const respondToReview = async (user, reviewId, payload) => {
  const review = await Review.findById(reviewId);
  ensure(review && review.isVisible, "Review not found", 404);

  const isOwner = String(review.reviewee) === String(user._id);
  const isAdmin = ["admin", "superadmin"].includes(String(user.role || ""));
  ensure(
    isOwner || isAdmin,
    "Only the reviewed user can respond to this review",
    403,
  );

  const text = sanitizeReviewComment(payload.text);
  ensure(text.length >= 2, "Response must be at least 2 characters", 400);

  review.response = {
    text,
    responder: user._id,
    respondedAt: new Date(),
  };
  await review.save();

  return Review.findById(review._id)
    .populate("reviewer", "fullName username avatar")
    .populate("response.responder", "fullName username avatar")
    .lean();
};

export const toggleReviewHelpful = async (userId, reviewId) => {
  const review = await Review.findById(reviewId).select(
    "reviewer helpfulCount +helpfulBy isVisible",
  );

  ensure(review && review.isVisible, "Review not found", 404);
  ensure(
    String(review.reviewer) !== String(userId),
    "You cannot vote on your own review",
    400,
  );

  const ids = (review.helpfulBy || []).map((id) => String(id));
  if (!Array.isArray(review.helpfulBy)) review.helpfulBy = [];
  const idx = ids.findIndex((id) => id === String(userId));
  let isHelpful = false;

  if (idx >= 0) {
    review.helpfulBy.splice(idx, 1);
    isHelpful = false;
  } else {
    review.helpfulBy.push(userId);
    isHelpful = true;
  }

  review.helpfulCount = review.helpfulBy.length;
  await review.save();

  return {
    reviewId: review._id,
    helpfulCount: review.helpfulCount,
    isHelpful,
  };
};

export const getReviewStatusForOrder = async (userId, orderId) => {
  const order = await Order.findOne({
    _id: orderId,
    $or: [{ buyer: userId }, { seller: userId }],
  })
    .select("status buyer seller orderType review")
    .lean();

  ensure(order, "Order not found", 404);

  const isBuyer = String(order.buyer) === String(userId);
  const existingReview = await Review.findOne({
    order: orderId,
    reviewer: userId,
  })
    .populate("response.responder", "fullName username avatar")
    .lean();

  return {
    orderId,
    orderStatus: order.status,
    isBuyer,
    hasReview: Boolean(existingReview),
    canWrite: isBuyer && order.status === "completed" && !existingReview,
    canEdit: isBuyer && order.status === "completed" && Boolean(existingReview),
    review: existingReview
      ? {
          _id: existingReview._id,
          rating: existingReview.rating,
          comment: existingReview.comment,
          editedAt: existingReview.editedAt,
          response: existingReview.response || null,
        }
      : null,
  };
};
