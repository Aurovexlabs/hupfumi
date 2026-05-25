import { Router } from "express";
import { postValidateCoupon } from "../controllers/coupon.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

router.post("/validate", protect, requireMarketplaceUser, postValidateCoupon);

export default router;
