import { Router } from "express";
import {
  getMyProductList,
  getProduct,
  getProducts,
  patchProduct,
  postProduct,
  removeProduct,
} from "../controllers/product.controller.js";
import {
  optionalAuth,
  protect,
  requireMarketplaceUser,
} from "../utils/auth.js";

const router = Router();
router.get("/", optionalAuth, getProducts);
router.get("/my", protect, requireMarketplaceUser, getMyProductList);
router.get("/:slug", optionalAuth, getProduct);
router.post("/", protect, requireMarketplaceUser, postProduct);
router.patch("/:id", protect, requireMarketplaceUser, patchProduct);
router.delete("/:id", protect, requireMarketplaceUser, removeProduct);

export default router;
