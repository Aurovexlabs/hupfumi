import { Router } from "express";
import {
  getPaynowReturn,
  postPaynowResult,
  postWalletPayment,
} from "../controllers/payment.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

router.post("/paynow/result", postPaynowResult);
router.get("/paynow/return", getPaynowReturn);
router.post("/wallet", protect, requireMarketplaceUser, postWalletPayment);

export default router;
