import { Router } from "express";
import { arcjetClients } from "../config/arcjet.js";
import {
  deleteUploadAsset,
  getImageKitAuth,
  postUploadAsset,
} from "../controllers/upload.controller.js";
import { createArcjetMiddleware } from "../middleware/arcjet.middleware.js";
import {
  genericSingleUpload,
  runUpload,
} from "../middleware/upload.middleware.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

const uploadGuard = createArcjetMiddleware(arcjetClients.uploads);

router.get(
  "/imagekit/auth",
  protect,
  requireMarketplaceUser,
  uploadGuard,
  getImageKitAuth,
);
router.post(
  "/imagekit",
  protect,
  requireMarketplaceUser,
  uploadGuard,
  runUpload(genericSingleUpload),
  postUploadAsset,
);
router.delete(
  "/imagekit/:fileId",
  protect,
  requireMarketplaceUser,
  uploadGuard,
  deleteUploadAsset,
);

export default router;
