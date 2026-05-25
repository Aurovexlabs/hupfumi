import { Router } from "express";
import {
  getSavedCheck,
  getSavedItems,
  postToggleSaved,
} from "../controllers/saved.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

router.get("/", protect, requireMarketplaceUser, getSavedItems);
router.get("/check", protect, requireMarketplaceUser, getSavedCheck);
router.post("/toggle", protect, requireMarketplaceUser, postToggleSaved);

export default router;
