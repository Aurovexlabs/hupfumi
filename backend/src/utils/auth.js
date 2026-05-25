import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { fail } from "./response.js";

if (process.env.NODE_ENV === "production" && !process.env.JWT_ACCESS_SECRET) {
  throw new Error("JWT_ACCESS_SECRET is required in production");
}

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || "hupfumi_access_secret_dev";
const ADMIN_ROLES = new Set(["admin", "superadmin"]);

const promoteEligibleAccountStatus = async (user) => {
  if (!user) return user;

  const legacyEmailVerified = user.emailVerified === true;
  let shouldSave = false;

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

const getBearerToken = (req) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
};

export const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return fail(res, "Unauthorized", 401);
    const { id } = jwt.verify(token, ACCESS_SECRET);
    const user = await User.findById(id);
    if (!user) return fail(res, "User not found", 404);

    await promoteEligibleAccountStatus(user);

    if (user.accountStatus === "banned" || user.accountStatus === "suspended")
      return fail(res, "Account suspended", 403);
    if (!user.isEmailVerified)
      return fail(res, "Please verify your email first", 403);
    if (user.accountStatus !== "active")
      return fail(res, "Account is not active", 403);

    req.user = user;
    next();
  } catch {
    fail(res, "Unauthorized", 401);
  }
};

export const optionalAuth = async (req, _res, next) => {
  try {
    const token = getBearerToken(req);
    if (token) {
      const { id } = jwt.verify(token, ACCESS_SECRET);
      req.user = await User.findById(id);
    }
  } catch {}
  next();
};

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return fail(res, "Unauthorized", 401);
    if (!roles.includes(req.user.role)) return fail(res, "Forbidden", 403);
    next();
  };

export const requireMarketplaceUser = (req, res, next) => {
  if (!req.user) return fail(res, "Unauthorized", 401);

  if (ADMIN_ROLES.has(req.user.role)) {
    return fail(res, "Admin accounts are restricted to the admin console", 403);
  }

  return next();
};
