import { Router } from "express";
import {
  getMyServiceList,
  getService,
  getServices,
  patchService,
  postService,
  removeService,
} from "../controllers/service.controller.js";
import {
  optionalAuth,
  protect,
  requireMarketplaceUser,
} from "../utils/auth.js";

const router = Router();
router.get("/", optionalAuth, getServices);
router.get("/my", protect, requireMarketplaceUser, getMyServiceList);
router.get("/:slug", optionalAuth, getService);
router.post("/", protect, requireMarketplaceUser, postService);
router.patch("/:id", protect, requireMarketplaceUser, patchService);
router.delete("/:id", protect, requireMarketplaceUser, removeService);

export default router;
