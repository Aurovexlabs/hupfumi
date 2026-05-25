import { Router } from "express";
import { arcjetClients } from "../config/arcjet.js";
import {
  getDepositByReference,
  getTransactions,
  getWallet,
  postConfirmDeposit,
  postDeposit,
  postWithdraw,
} from "../controllers/wallet.controller.js";
import { createArcjetMiddleware } from "../middleware/arcjet.middleware.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();

const walletGuard = createArcjetMiddleware(arcjetClients.wallet);

router.get("/", protect, requireMarketplaceUser, getWallet);
router.get("/transactions", protect, requireMarketplaceUser, getTransactions);
router.get(
  "/deposit/:reference/status",
  protect,
  requireMarketplaceUser,
  walletGuard,
  getDepositByReference,
);
router.post(
  "/deposit",
  protect,
  requireMarketplaceUser,
  walletGuard,
  postDeposit,
);
router.post(
  "/deposit/:reference/confirm",
  protect,
  requireMarketplaceUser,
  walletGuard,
  postConfirmDeposit,
);
router.post(
  "/withdraw",
  protect,
  requireMarketplaceUser,
  walletGuard,
  postWithdraw,
);

export default router;
