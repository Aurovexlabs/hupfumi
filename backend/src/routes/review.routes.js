import { Router } from "express";
import {
  getReviewOrderStatus,
  getReviews,
  patchReview,
  patchReviewResponse,
  postReview,
  postToggleReviewHelpful,
} from "../controllers/review.controller.js";
import {
  optionalAuth,
  protect,
  requireMarketplaceUser,
} from "../utils/auth.js";

const router = Router();

router.get(
  "/order/:orderId/status",
  protect,
  requireMarketplaceUser,
  getReviewOrderStatus,
);
router.get("/:refType/:refId", optionalAuth, getReviews);
router.post("/", protect, requireMarketplaceUser, postReview);
router.patch("/:reviewId", protect, requireMarketplaceUser, patchReview);
router.patch(
  "/:reviewId/response",
  protect,
  requireMarketplaceUser,
  patchReviewResponse,
);
router.post(
  "/:reviewId/helpful",
  protect,
  requireMarketplaceUser,
  postToggleReviewHelpful,
);

export default router;
