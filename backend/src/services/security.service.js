import crypto from "node:crypto";
import AdminAuditLog from "../models/AdminAuditLog.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import UserActivity from "../models/UserActivity.js";
import { ensure } from "../utils/appError.js";
import { buildPagination } from "../utils/response.js";
import {
  isEmailConfigured,
  sendSecurityLoginAlertEmail,
} from "./email.service.js";

const ACTIVITY_HASH_PEPPER =
  process.env.ACTIVITY_HASH_PEPPER || "hupfumi_activity_hash_pepper";
const KNOWN_DEVICE_LOOKBACK_DAYS = Math.max(
  30,
  Number(process.env.KNOWN_DEVICE_LOOKBACK_DAYS || 180),
);

const normalizeIp = (ip = "") => {
  const raw = String(ip || "").trim();
  if (!raw) return "unknown";

  const first = raw.includes(",")
    ? raw
        .split(",")
        .map((entry) => entry.trim())
        .find(Boolean)
    : raw;

  if (!first) return "unknown";
  return first.replace(/^::ffff:/i, "");
};

const maskIpAddress = (ip = "") => {
  const normalized = normalizeIp(ip);
  if (normalized === "unknown") return normalized;

  if (/^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    const parts = normalized.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.x`;
  }

  if (normalized.includes(":")) {
    const parts = normalized.split(":").filter(Boolean);
    if (parts.length <= 2) return "xxxx:xxxx::";
    return `${parts.slice(0, 2).join(":")}:xxxx::`;
  }

  return "unknown";
};

const hashValue = (value = "") =>
  crypto
    .createHash("sha256")
    .update(`${String(value)}:${ACTIVITY_HASH_PEPPER}`)
    .digest("hex");

const parseUserAgent = (ua = "") => {
  const normalized = String(ua || "").toLowerCase();

  const browser = /edg\//.test(normalized)
    ? "Edge"
    : /opr\//.test(normalized)
      ? "Opera"
      : /chrome\//.test(normalized)
        ? "Chrome"
        : /safari\//.test(normalized) && !/chrome\//.test(normalized)
          ? "Safari"
          : /firefox\//.test(normalized)
            ? "Firefox"
            : /msie|trident\//.test(normalized)
              ? "IE"
              : "Unknown";

  const os = /windows nt/.test(normalized)
    ? "Windows"
    : /android/.test(normalized)
      ? "Android"
      : /iphone|ipad|ios/.test(normalized)
        ? "iOS"
        : /mac os x|macintosh/.test(normalized)
          ? "macOS"
          : /linux/.test(normalized)
            ? "Linux"
            : "Unknown";

  const isBot = /bot|crawler|spider|curl|postman|insomnia/.test(normalized);
  const deviceType = isBot
    ? "bot"
    : /ipad|tablet/.test(normalized)
      ? "tablet"
      : /mobi|android|iphone/.test(normalized)
        ? "mobile"
        : browser === "Unknown"
          ? "unknown"
          : "desktop";

  return {
    browser,
    os,
    deviceType,
    isBot,
  };
};

const getApproxLocation = (req) => {
  const country =
    req.get("cf-ipcountry") ||
    req.get("x-vercel-ip-country") ||
    req.get("x-country-code") ||
    "Unknown";
  const region =
    req.get("x-vercel-ip-country-region") ||
    req.get("x-appengine-region") ||
    "Unknown";
  const city = req.get("x-vercel-ip-city") || "Unknown";

  return {
    country: String(country || "Unknown"),
    region: String(region || "Unknown"),
    city: String(city || "Unknown"),
    source: "headers",
  };
};

const buildDeviceFingerprint = ({
  userAgent,
  device,
  acceptLanguage,
  platformHint,
}) => {
  const payload = [
    device.browser,
    device.os,
    device.deviceType,
    String(acceptLanguage || "").slice(0, 64),
    String(platformHint || "").slice(0, 64),
    String(userAgent || "").slice(0, 200),
  ].join("|");

  return hashValue(payload);
};

export const getRequestSecurityContext = (req) => {
  const userAgent = String(req.get("user-agent") || "");
  const ipAddress = normalizeIp(
    req.get("x-forwarded-for") || req.get("x-real-ip") || req.ip || "",
  );
  const device = parseUserAgent(userAgent);
  const acceptLanguage = req.get("accept-language") || "";
  const platformHint =
    req.get("sec-ch-ua-platform") || req.get("x-device-platform") || "";

  return {
    ipAddress,
    ipMasked: maskIpAddress(ipAddress),
    ipHash: hashValue(ipAddress),
    userAgent,
    device,
    location: getApproxLocation(req),
    deviceFingerprint: buildDeviceFingerprint({
      userAgent,
      device,
      acceptLanguage,
      platformHint,
    }),
    requestId: String(req.requestId || ""),
  };
};

const toActivityView = (activity) => {
  const record = activity?.toObject ? activity.toObject() : activity;
  if (!record) return null;

  return {
    _id: record._id,
    eventType: record.eventType,
    authMethod: record.authMethod,
    ipAddress: record.ipMasked || "unknown",
    device: record.device,
    location: record.location,
    isNewDevice: Boolean(record.isNewDevice),
    trusted: Boolean(record.trusted),
    suspicious: Boolean(record.suspicious),
    reviewedAt: record.reviewedAt || null,
    reviewedAction: record.reviewedAction || null,
    reviewedNote: record.reviewedNote || "",
    createdAt: record.createdAt,
  };
};

const sendNewDeviceSignals = async ({ user, context, authMethod }) => {
  const deviceLabel = `${context.device.browser} on ${context.device.os}`;
  const locationLabel = [
    context.location.city,
    context.location.region,
    context.location.country,
  ]
    .filter((value) => value && value !== "Unknown")
    .join(", ");

  await Notification.create({
    user: user._id,
    type: "security",
    title: "New device sign-in detected",
    body: `A new ${context.device.deviceType} (${deviceLabel}) signed into your account${
      locationLabel ? ` from ${locationLabel}` : ""
    }.`,
    link: "/settings/profile",
    metadata: {
      authMethod,
      device: context.device,
      location: context.location,
      occurredAt: new Date().toISOString(),
    },
  });

  if (!isEmailConfigured() || !user?.email) return;

  try {
    await sendSecurityLoginAlertEmail({
      to: user.email,
      fullName: user.fullName,
      deviceType: context.device.deviceType,
      browser: context.device.browser,
      os: context.device.os,
      ipMasked: context.ipMasked,
      location: locationLabel || "Unknown location",
      occurredAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to send security login alert email:", error.message);
  }
};

export const logLoginActivity = async ({
  user,
  req,
  authMethod = "password",
  eventType = "login_success",
  metadata = {},
}) => {
  ensure(user?._id, "User is required for activity logging", 400);

  const context = getRequestSecurityContext(req);
  const lookbackSince = new Date(
    Date.now() - KNOWN_DEVICE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000,
  );

  const hasKnownDevice = await UserActivity.exists({
    user: user._id,
    eventType: "login_success",
    deviceFingerprint: context.deviceFingerprint,
    createdAt: { $gte: lookbackSince },
  });

  const isNewDevice = eventType === "login_success" && !hasKnownDevice;

  const activity = await UserActivity.create({
    user: user._id,
    eventType,
    authMethod,
    ipAddress: context.ipAddress,
    ipMasked: context.ipMasked,
    ipHash: context.ipHash,
    userAgent: context.userAgent,
    deviceFingerprint: context.deviceFingerprint,
    device: context.device,
    location: context.location,
    isNewDevice,
    metadata,
  });

  if (isNewDevice) {
    await sendNewDeviceSignals({ user, context, authMethod });
  }

  return {
    activity: toActivityView(activity),
    isNewDevice,
  };
};

export const listUserActivities = async (userId, query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const eventType = query.eventType ? String(query.eventType) : undefined;

  const filter = { user: userId };
  if (eventType) filter.eventType = eventType;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    UserActivity.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
    UserActivity.countDocuments(filter),
  ]);

  return {
    data: data.map((entry) =>
      toActivityView({
        ...entry,
        ipMasked: entry.ipMasked || maskIpAddress(entry.ipAddress),
      }),
    ),
    pagination: buildPagination(page, limit, total),
  };
};

export const applyUserActivityAction = async ({
  userId,
  activityId,
  action,
  note,
}) => {
  const activity = await UserActivity.findOne({
    _id: activityId,
    user: userId,
  });
  ensure(activity, "Activity not found", 404);

  const reviewedNote = String(note || "")
    .trim()
    .slice(0, 300);

  activity.reviewedAt = new Date();
  activity.reviewedAction = action;
  activity.reviewedNote = reviewedNote;

  if (action === "mark_safe") {
    activity.trusted = true;
    activity.suspicious = false;
  }

  if (action === "report_suspicious" || action === "lock_account") {
    activity.trusted = false;
    activity.suspicious = true;

    await Notification.create({
      user: userId,
      type: "security",
      title: "Suspicious sign-in reported",
      body: "We recorded your security report and flagged the login event for follow-up.",
      link: "/settings/profile",
      metadata: {
        activityId: String(activity._id),
        action,
      },
    });
  }

  let account = null;
  if (action === "lock_account") {
    account = await User.findById(userId);
    ensure(account, "User not found", 404);

    if (!["banned", "suspended"].includes(String(account.accountStatus))) {
      account.accountStatus = "suspended";
      await account.save();
    }
  }

  await activity.save();

  await UserActivity.create({
    user: userId,
    eventType: "security_action",
    authMethod: "unknown",
    ipAddress: activity.ipAddress,
    ipMasked: activity.ipMasked,
    ipHash: activity.ipHash,
    userAgent: activity.userAgent,
    deviceFingerprint: activity.deviceFingerprint,
    device: activity.device,
    location: activity.location,
    isNewDevice: false,
    trusted: action === "mark_safe",
    suspicious: action !== "mark_safe",
    reviewedAt: activity.reviewedAt,
    reviewedAction: action,
    reviewedNote,
    metadata: {
      sourceActivityId: String(activity._id),
    },
  });

  return {
    activity: toActivityView(activity),
    accountStatus: account?.accountStatus || null,
  };
};

export const recordAdminAudit = async ({
  actor,
  action,
  targetType = "user",
  targetId = "",
  targetUser = null,
  reason = "",
  metadata = {},
  req,
}) => {
  if (!actor?._id || !action) return null;

  const context = req ? getRequestSecurityContext(req) : null;

  return AdminAuditLog.create({
    actor: actor._id,
    actorRole: actor.role || "admin",
    action,
    targetType,
    targetId: String(targetId || ""),
    targetUser,
    reason: String(reason || "").slice(0, 300),
    requestId: context?.requestId || "",
    ipAddress: context?.ipAddress || "unknown",
    ipMasked: context?.ipMasked || "unknown",
    userAgent: context?.userAgent || "",
    metadata,
  });
};

export const listAdminAuditLogs = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const action = query.action ? String(query.action) : "";

  const filter = {};
  if (action) filter.action = action;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    AdminAuditLog.find(filter)
      .sort("-createdAt")
      .skip(skip)
      .limit(limit)
      .populate("actor", "fullName username role")
      .lean(),
    AdminAuditLog.countDocuments(filter),
  ]);

  return {
    data,
    pagination: buildPagination(page, limit, total),
  };
};
