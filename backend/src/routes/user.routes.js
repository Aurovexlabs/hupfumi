import {
  deleteMe,
  getMeWorkspace,
  getMyActivity,
  meKyc,
  patchMe,
  patchMeAvatar,
  postKyc,
  postMyActivityAction,
  publicProfile,
  putMeWorkspaceListingNote,
  putMeWorkspaceProductCompare,
} from "../controllers/user.controller.js";
import {
  avatarUpload,
  kycUpload,
  runUpload,
} from "../middleware/upload.middleware.js";

import { Router } from "express";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

router.get("/me/kyc", protect, requireMarketplaceUser, meKyc);
router.post(
  "/me/kyc",
  protect,
  requireMarketplaceUser,
  runUpload(kycUpload),
  postKyc,
);
router.patch("/me/avatar", protect, runUpload(avatarUpload), patchMeAvatar);
router.patch("/me", protect, patchMe);
router.get("/me/workspace", protect, getMeWorkspace);
router.put("/me/workspace/listing-note", protect, putMeWorkspaceListingNote);
router.put(
  "/me/workspace/product-compare",
  protect,
  putMeWorkspaceProductCompare,
);
router.delete("/me", protect, deleteMe);
router.get("/me/activity", protect, getMyActivity);
router.post("/me/activity/:activityId/action", protect, postMyActivityAction);
router.get("/:username", publicProfile);

export default router;
