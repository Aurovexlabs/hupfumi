import { Router } from "express";
import {
  getBuyingOrders,
  getOrder,
  getSellingOrders,
  patchOrderStatus,
  postCompleteOrder,
  postOrder,
} from "../controllers/order.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();
router.get("/buying", protect, requireMarketplaceUser, getBuyingOrders);
router.get("/selling", protect, requireMarketplaceUser, getSellingOrders);
router.get("/:id", protect, requireMarketplaceUser, getOrder);
router.post("/", protect, requireMarketplaceUser, postOrder);
router.patch("/:id/status", protect, requireMarketplaceUser, patchOrderStatus);
router.post(
  "/:id/complete",
  protect,
  requireMarketplaceUser,
  postCompleteOrder,
);

export default router;
