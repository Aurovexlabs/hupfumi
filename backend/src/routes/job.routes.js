import { Router } from "express";
import {
  apply,
  getApplications,
  getJob,
  getJobs,
  getMyApplicationsList,
  getMyJobsList,
  patchApplication,
  patchJob,
  postJob,
  removeJob,
} from "../controllers/job.controller.js";
import {
  optionalAuth,
  protect,
  requireMarketplaceUser,
} from "../utils/auth.js";

const router = Router();
router.get("/", optionalAuth, getJobs);
router.get("/my", protect, requireMarketplaceUser, getMyJobsList);
router.get(
  "/applications/my",
  protect,
  requireMarketplaceUser,
  getMyApplicationsList,
);
router.get("/:slug", optionalAuth, getJob);
router.post("/", protect, requireMarketplaceUser, postJob);
router.patch("/:id", protect, requireMarketplaceUser, patchJob);
router.delete("/:id", protect, requireMarketplaceUser, removeJob);
router.get(
  "/:id/applications",
  protect,
  requireMarketplaceUser,
  getApplications,
);
router.post("/:id/apply", protect, requireMarketplaceUser, apply);
router.patch(
  "/:jobId/applications/:appId",
  protect,
  requireMarketplaceUser,
  patchApplication,
);

export default router;
