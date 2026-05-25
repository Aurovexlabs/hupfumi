import { z } from "zod";
import {
  createReview,
  getReviewStatusForOrder,
  listReviews,
  respondToReview,
  toggleReviewHelpful,
  updateReview,
} from "../services/review.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const refTypeSchema = z.enum(["job", "service", "product"]);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sort: z.enum(["newest", "highest", "lowest", "helpful"]).default("newest"),
  rating: z
    .preprocess(
      (value) => (value == null || value === "" ? undefined : Number(value)),
      z.number().int().min(1).max(5).optional(),
    )
    .optional(),
});

const listParamsSchema = z.object({
  refType: refTypeSchema,
  refId: objectIdSchema,
});

const createReviewSchema = z.object({
  orderId: objectIdSchema,
  rating: z.coerce.number().min(1).max(5),
  comment: z.string().trim().min(10).max(2000),
});

const updateReviewSchema = z
  .object({
    rating: z.coerce.number().min(1).max(5).optional(),
    comment: z.string().trim().min(10).max(2000).optional(),
  })
  .refine((data) => data.rating != null || data.comment != null, {
    message: "At least one field is required",
  });

const reviewResponseSchema = z.object({
  text: z.string().trim().min(2).max(2000),
});

export const getReviews = async (req, res) => {
  try {
    const paramsParsed = listParamsSchema.safeParse(req.params);
    if (!paramsParsed.success)
      return fail(res, "Invalid review reference", 400);

    const queryParsed = listQuerySchema.safeParse(req.query);
    if (!queryParsed.success) return fail(res, "Invalid review query", 400);

    const reviews = await listReviews(
      paramsParsed.data.refType,
      paramsParsed.data.refId,
      queryParsed.data,
      req.user?._id,
    );

    return ok(res, reviews);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postReview = async (req, res) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success)
      return fail(res, "orderId, rating, and comment required", 400);

    const review = await createReview(req.user._id, parsed.data);
    return ok(res, review, "Review submitted", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchReview = async (req, res) => {
  try {
    const reviewIdParsed = objectIdSchema.safeParse(req.params.reviewId);
    if (!reviewIdParsed.success) return fail(res, "Invalid review id", 400);

    const bodyParsed = updateReviewSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid review update payload", 400);

    const review = await updateReview(
      req.user._id,
      reviewIdParsed.data,
      bodyParsed.data,
    );
    return ok(res, review, "Review updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchReviewResponse = async (req, res) => {
  try {
    const reviewIdParsed = objectIdSchema.safeParse(req.params.reviewId);
    if (!reviewIdParsed.success) return fail(res, "Invalid review id", 400);

    const bodyParsed = reviewResponseSchema.safeParse(req.body);
    if (!bodyParsed.success) return fail(res, "Response text required", 400);

    const review = await respondToReview(
      req.user,
      reviewIdParsed.data,
      bodyParsed.data,
    );

    return ok(res, review, "Review response saved");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postToggleReviewHelpful = async (req, res) => {
  try {
    const reviewIdParsed = objectIdSchema.safeParse(req.params.reviewId);
    if (!reviewIdParsed.success) return fail(res, "Invalid review id", 400);

    const data = await toggleReviewHelpful(req.user._id, reviewIdParsed.data);
    return ok(res, data, "Review helpful vote updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getReviewOrderStatus = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.orderId);
    if (!parsed.success) return fail(res, "Invalid order id", 400);

    const data = await getReviewStatusForOrder(req.user._id, parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};
