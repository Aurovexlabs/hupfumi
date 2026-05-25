import {
  forgot,
  login,
  loginTwoFactor,
  logout,
  me,
  postTwoFactorDisableConfirm,
  postTwoFactorDisableRequest,
  postTwoFactorSetupConfirm,
  postTwoFactorSetupRequest,
  refresh,
  register,
  resendVerify,
  reset,
  verify,
} from "../controllers/auth.controller.js";

import { Router } from "express";
import { arcjetClients } from "../config/arcjet.js";
import { createArcjetMiddleware } from "../middleware/arcjet.middleware.js";
import { protect } from "../utils/auth.js";

const router = Router();

const authGuard = createArcjetMiddleware(arcjetClients.auth);
const signupGuard = createArcjetMiddleware(arcjetClients.signup, {
  buildProps: (req) => ({
    email: req.body?.email,
  }),
});

router.post("/register", signupGuard, register);
router.post("/login", authGuard, login);
router.post("/2fa/login", authGuard, loginTwoFactor);
router.post("/refresh", refresh);
router.post("/logout", logout);
router.get("/me", me);
router.post("/2fa/setup/request", protect, postTwoFactorSetupRequest);
router.post("/2fa/setup/confirm", protect, postTwoFactorSetupConfirm);
router.post("/2fa/disable/request", protect, postTwoFactorDisableRequest);
router.post("/2fa/disable/confirm", protect, postTwoFactorDisableConfirm);
router.post("/forgot-password", authGuard, forgot);
router.post("/reset-password", authGuard, reset);
router.post("/verify-email", authGuard, verify);
router.post("/verify-email/resend", authGuard, resendVerify);

export default router;
