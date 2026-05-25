import { Router } from "express";
import {
  deleteNotification,
  getNotificationList,
  getNotificationUnreadCount,
  patchNotificationRead,
} from "../controllers/notification.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

router.get("/", protect, requireMarketplaceUser, getNotificationList);
router.get(
  "/unread-count",
  protect,
  requireMarketplaceUser,
  getNotificationUnreadCount,
);
router.patch("/read", protect, requireMarketplaceUser, patchNotificationRead);
router.delete("/:id", protect, requireMarketplaceUser, deleteNotification);

export default router;
