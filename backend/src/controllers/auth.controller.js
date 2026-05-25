import {
  confirmTwoFactorDisable,
  confirmTwoFactorSetup,
  forgotPassword,
  getCurrentUser,
  getRefreshCookieOptions,
  loginUser,
  refreshCookieOptions,
  refreshSession,
  registerUser,
  requestTwoFactorDisable,
  requestTwoFactorSetup,
  resendVerificationEmail,
  resetPassword,
  verifyEmail,
  verifyLoginTwoFactor,
} from "../services/auth.service.js";
import { fail, ok } from "../utils/response.js";

import { z } from "zod";
import { logLoginActivity } from "../services/security.service.js";
import { handleControllerError } from "../utils/controller.js";
import { getBearerToken } from "../utils/http.js";

const captureLoginActivitySafely = async ({
  req,
  user,
  authMethod,
  eventType = "login_success",
}) => {
  try {
    await logLoginActivity({
      req,
      user,
      authMethod,
      eventType,
    });
  } catch (error) {
    console.error("Failed to capture login activity:", error.message);
  }
};

const registerSchema = z.object({
  fullName: z.string().trim().min(2),
  username: z
    .string()
    .trim()
    .min(3)
    .regex(/^[a-z0-9_]+$/i),
  email: z.string().trim().email(),
  password: z.string().min(8),
  profileType: z
    .enum(["individual", "freelancer", "business"])
    .default("individual"),
});

const loginSchema = z.object({
  email: z.string().trim().min(3),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

const forgotSchema = z.object({
  email: z.string().trim().email(),
});

const resetSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

const verifySchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
  email: z.string().trim().email().optional(),
});

const resendVerifySchema = z.object({
  email: z.string().trim().email(),
});

const twoFactorOtpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
});

const loginTwoFactorSchema = z.object({
  challengeToken: z.string().trim().min(20),
  otp: z.string().regex(/^\d{6}$/),
});

const disableTwoFactorSchema = z.object({
  otp: z.string().regex(/^\d{6}$/),
  password: z.string().min(8).optional(),
});

export const register = async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid registration payload", 400);

    const result = await registerUser(parsed.data);
    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

    return ok(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Account created. Verify your email to activate your account.",
      201,
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const login = async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success)
      return fail(res, "Email/username and password required", 400);

    const result = await loginUser(parsed.data);

    if (result.requiresTwoFactor) {
      await captureLoginActivitySafely({
        req,
        user: { _id: result.userId },
        authMethod: "two_factor",
        eventType: "login_challenge",
      });

      return ok(
        res,
        {
          requiresTwoFactor: true,
          challengeToken: result.challengeToken,
          method: result.method,
          expiresInSeconds: result.expiresInSeconds,
        },
        "Two-factor authentication required",
      );
    }

    res.cookie(
      "refreshToken",
      result.refreshToken,
      getRefreshCookieOptions(Boolean(result.rememberMe)),
    );

    await captureLoginActivitySafely({
      req,
      user: result.user,
      authMethod: "password",
    });

    return ok(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Logged in",
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const refresh = async (req, res) => {
  try {
    const result = await refreshSession(req.cookies.refreshToken);
    return ok(res, result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const logout = async (_req, res) => {
  res.clearCookie("refreshToken", refreshCookieOptions);
  return ok(res, null, "Logged out");
};

export const me = async (req, res) => {
  try {
    const accessToken = getBearerToken(req);
    const user = await getCurrentUser(accessToken);
    return ok(res, user);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const forgot = async (req, res) => {
  try {
    const parsed = forgotSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Email required", 400);

    await forgotPassword(parsed.data);
    return ok(res, null, "If that email exists, a reset link has been sent.");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const reset = async (req, res) => {
  try {
    const parsed = resetSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Token and password required", 400);

    await resetPassword(parsed.data);
    return ok(res, null, "Password updated successfully");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const verify = async (req, res) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Valid 6-digit OTP required", 400);

    const accessToken = getBearerToken(req);
    const result = await verifyEmail({
      accessToken,
      otp: parsed.data.otp,
      email: parsed.data.email,
    });
    res.cookie("refreshToken", result.refreshToken, refreshCookieOptions);

    return ok(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Email verified",
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const loginTwoFactor = async (req, res) => {
  try {
    const parsed = loginTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, "Challenge token and valid 6-digit code required", 400);
    }

    const result = await verifyLoginTwoFactor(parsed.data);
    res.cookie(
      "refreshToken",
      result.refreshToken,
      getRefreshCookieOptions(Boolean(result.rememberMe)),
    );

    await captureLoginActivitySafely({
      req,
      user: result.user,
      authMethod: "two_factor",
    });

    return ok(
      res,
      { user: result.user, accessToken: result.accessToken },
      "Logged in",
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postTwoFactorSetupRequest = async (req, res) => {
  try {
    const data = await requestTwoFactorSetup(req.user._id);
    return ok(res, data, "Two-factor setup code sent");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postTwoFactorSetupConfirm = async (req, res) => {
  try {
    const parsed = twoFactorOtpSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Valid 6-digit code required", 400);

    const data = await confirmTwoFactorSetup(req.user._id, parsed.data.otp);
    return ok(res, data, "Two-factor authentication enabled");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postTwoFactorDisableRequest = async (req, res) => {
  try {
    const data = await requestTwoFactorDisable(req.user._id);
    return ok(res, data, "Two-factor disable code sent");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postTwoFactorDisableConfirm = async (req, res) => {
  try {
    const parsed = disableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(
        res,
        "Valid code required. Include password for password accounts.",
        400,
      );
    }

    const data = await confirmTwoFactorDisable(req.user._id, parsed.data);
    return ok(res, data, "Two-factor authentication disabled");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const resendVerify = async (req, res) => {
  try {
    const parsed = resendVerifySchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Valid email required", 400);

    const data = await resendVerificationEmail(parsed.data);

    return ok(
      res,
      data,
      "If the account exists and needs verification, a new code has been sent.",
    );
  } catch (error) {
    return handleControllerError(res, error);
  }
};
