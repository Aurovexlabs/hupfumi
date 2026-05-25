import { AppError, ensure } from "../utils/appError.js";
import {
  isEmailConfigured,
  sendPasswordResetEmail,
  sendTwoFactorOtpEmail,
  sendVerificationOtpEmail,
} from "./email.service.js";

import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User from "../models/User.js";

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET)
) {
  throw new Error(
    "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in production",
  );
}

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "hupfumi_access_secret_dev";
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "hupfumi_refresh_secret_dev";
const TWO_FACTOR_CHALLENGE_SECRET =
  process.env.TWO_FACTOR_CHALLENGE_SECRET ||
  `${ACCESS_SECRET}_two_factor_challenge`;
const TWO_FACTOR_CODE_TTL_MS = 10 * 60 * 1000;
const TWO_FACTOR_MAX_ATTEMPTS = 5;
const VERIFICATION_OTP_TTL_MS = 10 * 60 * 1000;
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000;
const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const REMEMBER_ME_REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const hashTwoFactorCode = (otp) => {
  const pepper = process.env.TWO_FACTOR_PEPPER || "hupfumi_two_factor";

  return crypto
    .createHash("sha256")
    .update(`${String(otp)}:${pepper}:${ACCESS_SECRET}`)
    .digest("hex");
};

const signTwoFactorChallengeToken = (id, rememberMe = false) =>
  jwt.sign(
    { id, purpose: "2fa-login", rememberMe: Boolean(rememberMe) },
    TWO_FACTOR_CHALLENGE_SECRET,
    {
      expiresIn: "10m",
    },
  );

const verifyTwoFactorChallengeToken = (token) => {
  ensure(token, "Two-factor challenge token required", 400);

  try {
    const payload = jwt.verify(token, TWO_FACTOR_CHALLENGE_SECRET);
    ensure(
      payload?.purpose === "2fa-login",
      "Invalid two-factor challenge",
      401,
    );
    return payload;
  } catch {
    throw new AppError("Invalid or expired two-factor challenge", 401);
  }
};

const promoteEligibleAccountStatus = async (user) => {
  if (!user) return user;

  const legacyEmailVerified = user.emailVerified === true;
  let shouldSave = false;

  // Backfill legacy accounts that were active/verified before isEmailVerified existed.
  if (
    !user.isEmailVerified &&
    (legacyEmailVerified || user.accountStatus === "active")
  ) {
    user.isEmailVerified = true;
    shouldSave = true;
  }

  const status = user.accountStatus;
  if (
    user.isEmailVerified &&
    status !== "active" &&
    status !== "suspended" &&
    status !== "banned"
  ) {
    user.accountStatus = "active";
    shouldSave = true;
  }

  if (shouldSave) {
    await user.save();
  }

  return user;
};

const assertAccountCanLogin = (user) => {
  ensure(user, "Invalid credentials", 401);
  ensure(user.accountStatus !== "banned", "Account suspended", 403);
  ensure(user.accountStatus !== "suspended", "Account suspended", 403);
  ensure(
    user.isEmailVerified,
    "Please verify your email before signing in",
    403,
  );
  ensure(user.accountStatus === "active", "Account is not active", 403);
};

const sendTwoFactorCode = async (user, purpose) => {
  const otpCode = crypto.randomInt(100000, 1000000).toString();

  user.twoFactorOtp = {
    codeHash: hashTwoFactorCode(otpCode),
    expiresAt: new Date(Date.now() + TWO_FACTOR_CODE_TTL_MS),
    purpose,
    attempts: 0,
  };
  await user.save();

  try {
    if (isEmailConfigured()) {
      await sendTwoFactorOtpEmail({
        to: user.email,
        fullName: user.fullName,
        otp: otpCode,
        purpose,
      });
    }
  } catch (error) {
    user.twoFactorOtp = undefined;
    await user.save();

    if (process.env.NODE_ENV === "production") {
      throw new AppError("Unable to deliver a two-factor code right now", 503);
    }

    console.error("Failed to send two-factor code:", error.message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[DEV] Two-factor OTP (${purpose}) for ${user.email}: ${otpCode}`,
    );
  }

  return {
    method: user.twoFactorMethod || "email",
    expiresInSeconds: Math.floor(TWO_FACTOR_CODE_TTL_MS / 1000),
  };
};

const consumeTwoFactorCode = async (user, otp, purpose) => {
  const record = user.twoFactorOtp;

  ensure(
    record?.codeHash && record?.expiresAt && record?.purpose,
    "No active two-factor code. Request a new code.",
    400,
  );
  ensure(
    record.purpose === purpose,
    "Invalid two-factor verification flow",
    400,
  );

  if (record.expiresAt < new Date()) {
    user.twoFactorOtp = undefined;
    await user.save();
    throw new AppError("Two-factor code expired. Request a new code.", 400);
  }

  const providedHash = hashTwoFactorCode(otp);
  if (providedHash !== record.codeHash) {
    const attempts = Number(record.attempts || 0) + 1;
    if (attempts >= TWO_FACTOR_MAX_ATTEMPTS) {
      user.twoFactorOtp = undefined;
      await user.save();
      throw new AppError("Too many invalid attempts. Request a new code.", 400);
    }

    user.twoFactorOtp = {
      ...record,
      attempts,
    };
    await user.save();
    throw new AppError("Invalid two-factor code", 400);
  }

  user.twoFactorOtp = undefined;
  user.twoFactorLastVerifiedAt = new Date();
  await user.save();
};

const getRefreshTokenExpiry = (rememberMe = false) =>
  rememberMe ? "30d" : "7d";

export const getRefreshCookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
  maxAge: rememberMe
    ? REMEMBER_ME_REFRESH_TOKEN_TTL_MS
    : DEFAULT_REFRESH_TOKEN_TTL_MS,
});

export const refreshCookieOptions = getRefreshCookieOptions(false);

export const signAccessToken = (id) =>
  jwt.sign({ id }, ACCESS_SECRET, { expiresIn: "15m" });

export const signRefreshToken = (id, options = {}) =>
  jwt.sign({ id }, REFRESH_SECRET, {
    expiresIn: getRefreshTokenExpiry(Boolean(options.rememberMe)),
  });

export const registerUser = async ({
  fullName,
  username,
  email,
  password,
  profileType,
}) => {
  const normalizedEmail = email.toLowerCase();
  const normalizedUsername = username.toLowerCase();

  const exists = await User.findOne({
    $or: [{ email: normalizedEmail }, { username: normalizedUsername }],
  });

  if (exists) {
    throw new AppError(
      exists.email === normalizedEmail
        ? "Email already registered"
        : "Username taken",
      400,
    );
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpExpiresAt = new Date(Date.now() + VERIFICATION_OTP_TTL_MS);

  const user = await User.create({
    fullName,
    username: normalizedUsername,
    email: normalizedEmail,
    password,
    profileType,
    accountStatus: "pending",
    isEmailVerified: false,
    verificationOtpSentAt: new Date(),
    otp: { code: otpCode, expiresAt: otpExpiresAt },
  });

  try {
    if (isEmailConfigured()) {
      await sendVerificationOtpEmail({
        to: normalizedEmail,
        fullName,
        otp: otpCode,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      await User.findByIdAndDelete(user._id).catch(() => {});
      throw new AppError(
        "Unable to send verification email right now. Please try again.",
        503,
      );
    }

    console.error("Failed to send verification email:", error.message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Verify OTP for ${normalizedEmail}: ${otpCode}`);
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id);

  return { user, accessToken, refreshToken };
};

export const loginUser = async ({ email, password, rememberMe = false }) => {
  const identifier = String(email || "")
    .trim()
    .toLowerCase();

  const user = await User.findOne({
    $or: [{ email: identifier }, { username: identifier }],
  }).select("+password");
  await promoteEligibleAccountStatus(user);
  assertAccountCanLogin(user);

  const valid = await user.comparePassword(password);
  ensure(valid, "Invalid credentials", 401);

  if (user.twoFactorEnabled) {
    const twoFactor = await sendTwoFactorCode(user, "login");
    return {
      requiresTwoFactor: true,
      userId: user._id,
      challengeToken: signTwoFactorChallengeToken(user._id, rememberMe),
      ...twoFactor,
    };
  }

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id, { rememberMe });

  return {
    requiresTwoFactor: false,
    user,
    accessToken,
    refreshToken,
    rememberMe: Boolean(rememberMe),
  };
};

export const verifyLoginTwoFactor = async ({ challengeToken, otp }) => {
  const challenge = verifyTwoFactorChallengeToken(challengeToken);
  const rememberMe = Boolean(challenge.rememberMe);
  const user = await User.findById(challenge.id).select(
    "accountStatus isEmailVerified twoFactorEnabled twoFactorOtp",
  );

  ensure(user, "User not found", 404);
  await promoteEligibleAccountStatus(user);
  assertAccountCanLogin(user);
  ensure(
    user.twoFactorEnabled,
    "Two-factor authentication is not enabled",
    400,
  );
  ensure(
    /^\d{6}$/.test(String(otp || "")),
    "Valid two-factor code required",
    400,
  );

  await consumeTwoFactorCode(user, String(otp), "login");

  const sessionUser = await User.findById(user._id);
  ensure(sessionUser, "User not found", 404);

  const accessToken = signAccessToken(user._id);
  const refreshToken = signRefreshToken(user._id, { rememberMe });

  return {
    user: sessionUser,
    accessToken,
    refreshToken,
    rememberMe,
  };
};

export const requestTwoFactorSetup = async (userId) => {
  const user = await User.findById(userId).select(
    "email fullName isEmailVerified accountStatus twoFactorEnabled twoFactorMethod twoFactorOtp",
  );

  ensure(user, "User not found", 404);
  await promoteEligibleAccountStatus(user);
  ensure(
    user.isEmailVerified,
    "Verify email before enabling two-factor authentication",
    403,
  );
  ensure(
    user.accountStatus === "active",
    "Account must be active to enable two-factor authentication",
    403,
  );
  ensure(
    !user.twoFactorEnabled,
    "Two-factor authentication already enabled",
    400,
  );

  const twoFactor = await sendTwoFactorCode(user, "setup");

  return {
    enabled: false,
    ...twoFactor,
  };
};

export const confirmTwoFactorSetup = async (userId, otp) => {
  const user = await User.findById(userId).select(
    "twoFactorEnabled twoFactorMethod twoFactorOtp twoFactorLastVerifiedAt",
  );

  ensure(user, "User not found", 404);
  ensure(
    !user.twoFactorEnabled,
    "Two-factor authentication already enabled",
    400,
  );
  ensure(
    /^\d{6}$/.test(String(otp || "")),
    "Valid two-factor code required",
    400,
  );

  await consumeTwoFactorCode(user, String(otp), "setup");

  user.twoFactorEnabled = true;
  user.twoFactorMethod = "email";
  await user.save();

  return {
    enabled: true,
    method: user.twoFactorMethod,
    verifiedAt: user.twoFactorLastVerifiedAt,
  };
};

export const requestTwoFactorDisable = async (userId) => {
  const user = await User.findById(userId).select(
    "email fullName twoFactorEnabled twoFactorMethod twoFactorOtp",
  );

  ensure(user, "User not found", 404);
  ensure(
    user.twoFactorEnabled,
    "Two-factor authentication is not enabled",
    400,
  );

  const twoFactor = await sendTwoFactorCode(user, "disable");

  return {
    enabled: true,
    ...twoFactor,
  };
};

export const confirmTwoFactorDisable = async (userId, { otp, password }) => {
  const user = await User.findById(userId).select(
    "+password twoFactorEnabled twoFactorMethod twoFactorOtp twoFactorLastVerifiedAt",
  );

  ensure(user, "User not found", 404);
  ensure(
    user.twoFactorEnabled,
    "Two-factor authentication is not enabled",
    400,
  );
  ensure(
    /^\d{6}$/.test(String(otp || "")),
    "Valid two-factor code required",
    400,
  );

  if (user.password) {
    ensure(password, "Current password required", 400);
    const valid = await user.comparePassword(password);
    ensure(valid, "Invalid current password", 401);
  }

  await consumeTwoFactorCode(user, String(otp), "disable");

  user.twoFactorEnabled = false;
  user.twoFactorMethod = null;
  await user.save();

  return {
    enabled: false,
    method: null,
    verifiedAt: user.twoFactorLastVerifiedAt,
  };
};

export const refreshSession = async (refreshToken) => {
  ensure(refreshToken, "No refresh token", 401);

  try {
    const { id } = jwt.verify(refreshToken, REFRESH_SECRET);
    const user = await User.findById(id);
    ensure(user, "User not found", 401);
    await promoteEligibleAccountStatus(user);
    assertAccountCanLogin(user);

    const accessToken = signAccessToken(id);
    return { accessToken };
  } catch {
    throw new AppError("Invalid token", 401);
  }
};

export const getCurrentUser = async (accessToken) => {
  ensure(accessToken, "Unauthorized", 401);

  try {
    const { id } = jwt.verify(accessToken, ACCESS_SECRET);
    const user = await User.findById(id);
    ensure(user, "User not found", 404);
    return user;
  } catch {
    throw new AppError("Unauthorized", 401);
  }
};

export const forgotPassword = async ({ email }) => {
  const user = await User.findOne({ email: email.toLowerCase() });

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    user.otp = {
      code: token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    };
    await user.save();

    try {
      if (isEmailConfigured()) {
        await sendPasswordResetEmail({
          to: user.email,
          fullName: user.fullName,
          token,
        });
      }
    } catch (error) {
      console.error("Failed to send password reset email:", error.message);
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV] Reset token for ${email}: ${token}`);
    }
  }

  return { ok: true };
};

export const resetPassword = async ({ token, password }) => {
  const user = await User.findOne({
    "otp.code": token,
    "otp.expiresAt": { $gt: new Date() },
  });

  ensure(user, "Invalid or expired reset token", 400);

  user.password = password;
  user.otp = undefined;
  await user.save();

  return { ok: true };
};

export const verifyEmail = async ({ accessToken, otp, email }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();

  try {
    let user = null;

    if (accessToken) {
      try {
        const { id } = jwt.verify(accessToken, ACCESS_SECRET);
        user = await User.findById(id);
      } catch {
        user = null;
      }
    }

    if (!user) {
      ensure(normalizedEmail, "Email required", 400);
      user = await User.findOne({ email: normalizedEmail });
    }

    ensure(user, "User not found", 404);
    ensure(
      user.otp?.code && user.otp?.expiresAt,
      "No verification code found",
      400,
    );
    ensure(user.otp.expiresAt >= new Date(), "Verification code expired", 400);
    ensure(user.otp.code === otp, "Invalid verification code", 400);

    user.isEmailVerified = true;
    user.accountStatus = "active";
    user.otp = undefined;
    user.verificationOtpSentAt = undefined;
    await user.save();

    const nextAccessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    return { user, accessToken: nextAccessToken, refreshToken };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Unauthorized", 401);
  }
};

export const resendVerificationEmail = async ({ email }) => {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  ensure(normalizedEmail, "Email required", 400);

  const user = await User.findOne({ email: normalizedEmail });
  if (!user) {
    return {
      delivered: true,
      cooldownSeconds: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
    };
  }

  ensure(user.accountStatus !== "banned", "Account suspended", 403);
  ensure(user.accountStatus !== "suspended", "Account suspended", 403);

  if (user.isEmailVerified) {
    await promoteEligibleAccountStatus(user);
    return {
      delivered: true,
      alreadyVerified: true,
      cooldownSeconds: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
    };
  }

  const sentAt = user.verificationOtpSentAt
    ? new Date(user.verificationOtpSentAt).getTime()
    : 0;
  const retryAfterMs = sentAt + VERIFICATION_RESEND_COOLDOWN_MS - Date.now();

  if (retryAfterMs > 0) {
    throw new AppError(
      `Please wait ${Math.ceil(retryAfterMs / 1000)} seconds before requesting another code`,
      429,
    );
  }

  const otpCode = crypto.randomInt(100000, 1000000).toString();
  user.otp = {
    code: otpCode,
    expiresAt: new Date(Date.now() + VERIFICATION_OTP_TTL_MS),
  };
  user.verificationOtpSentAt = new Date();
  await user.save();

  try {
    if (isEmailConfigured()) {
      await sendVerificationOtpEmail({
        to: user.email,
        fullName: user.fullName,
        otp: otpCode,
      });
    }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        "Unable to send verification email right now. Please try again.",
        503,
      );
    }

    console.error("Failed to resend verification email:", error.message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV] Resent verify OTP for ${normalizedEmail}: ${otpCode}`);
  }

  return {
    delivered: true,
    cooldownSeconds: Math.floor(VERIFICATION_RESEND_COOLDOWN_MS / 1000),
    expiresInSeconds: Math.floor(VERIFICATION_OTP_TTL_MS / 1000),
  };
};
