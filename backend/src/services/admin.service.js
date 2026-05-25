import mongoose from "mongoose";
import Job from "../models/Job.js";
import Notification from "../models/Notification.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { ensure } from "../utils/appError.js";
import {
  isEmailConfigured,
  sendOrderStatusUpdateEmail,
} from "./email.service.js";
import { createModerationEvent } from "./moderation.service.js";
import { purgeUserAccountData } from "./user.service.js";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const DISPUTE_STATUS_FILTER = {
  $or: [{ status: "disputed" }, { "statusHistory.status": "disputed" }],
};
const RESOLVED_ORDER_STATUSES = ["completed", "cancelled", "refunded"];

const CONTENT_CONFIG = {
  job: {
    model: Job,
    ownerField: "employer",
    ownerSelect: "fullName username email",
    removeStatus: "closed",
    restoreStatus: "open",
    link: (slug) => `/jobs/${slug}`,
  },
  service: {
    model: Service,
    ownerField: "seller",
    ownerSelect: "fullName username email",
    removeStatus: "suspended",
    restoreStatus: "active",
    link: (slug) => `/services/${slug}`,
  },
  product: {
    model: Product,
    ownerField: "seller",
    ownerSelect: "fullName username email",
    removeStatus: "suspended",
    restoreStatus: "active",
    link: (slug) => `/products/${slug}`,
  },
};

const normalizeStatus = (status = "") => String(status || "").trim();

const maskDocumentNumber = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.length <= 4)
    return `${"*".repeat(Math.max(0, raw.length - 1))}${raw.slice(-1)}`;
  return `${"*".repeat(raw.length - 4)}${raw.slice(-4)}`;
};

const toContentView = (type, record) => {
  const cfg = CONTENT_CONFIG[type];
  const owner = record?.[cfg.ownerField] || null;
  const moderation = record?.moderation || {};

  return {
    _id: record._id,
    type,
    title: record.title,
    slug: record.slug,
    category: record.category,
    status: record.status,
    moderation: {
      status: moderation.status || "approved",
      score: moderation.score || 0,
      reasons: moderation.reasons || [],
      flaggedAt: moderation.flaggedAt || null,
      reviewedAt: moderation.reviewedAt || null,
    },
    owner: owner
      ? {
          _id: owner._id,
          fullName: owner.fullName,
          username: owner.username,
          email: owner.email,
        }
      : null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    link: cfg.link(record.slug),
  };
};

const toDisputeViewStatus = (orderStatus) => {
  if (orderStatus === "disputed") return "open";
  if (orderStatus === "in_progress") return "under_review";
  if (RESOLVED_ORDER_STATUSES.includes(orderStatus)) return "resolved";
  return "closed";
};

const asPublicUser = (user) =>
  user
    ? {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
      }
    : null;

const sameObjectId = (left, right) =>
  String(left || "") === String(right || "");

const sendAdminEmailSafely = async (label, callback) => {
  if (!isEmailConfigured()) return;

  try {
    await callback();
  } catch (error) {
    console.error(`Failed to send ${label} email:`, error.message);
  }
};

export const getDashboardMetrics = async () => {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [
    totalUsers,
    newUsers,
    totalOrders,
    newOrders,
    restrictedAccounts,
    disputes,
    pendingKyc,
    pendingJobModeration,
    pendingServiceModeration,
    pendingProductModeration,
    blockedListings,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ createdAt: { $gte: since } }),
    Order.countDocuments(),
    Order.countDocuments({ createdAt: { $gte: since } }),
    User.countDocuments({ accountStatus: { $in: ["suspended", "banned"] } }),
    Order.countDocuments({ status: { $in: ["disputed", "in_progress"] } }),
    User.countDocuments({ kycStatus: "pending" }),
    Job.countDocuments({ "moderation.status": "pending_review" }),
    Service.countDocuments({ "moderation.status": "pending_review" }),
    Product.countDocuments({ "moderation.status": "pending_review" }),
    Promise.all([
      Job.countDocuments({ "moderation.status": "blocked" }),
      Service.countDocuments({ "moderation.status": "blocked" }),
      Product.countDocuments({ "moderation.status": "blocked" }),
    ]).then((values) => values.reduce((sum, value) => sum + value, 0)),
  ]);

  return {
    users: { total: totalUsers, thisMonth: newUsers },
    orders: { total: totalOrders, thisMonth: newOrders },
    restrictedAccounts,
    disputes,
    pendingKyc,
    moderationQueue:
      pendingJobModeration +
      pendingServiceModeration +
      pendingProductModeration,
    blockedListings,
    revenue: { total: 0, thisMonth: 0 },
  };
};

const resolveDatabaseState = (state) => {
  if (state === 1) return "connected";
  if (state === 2) return "connecting";
  if (state === 3) return "disconnecting";
  return "disconnected";
};

const toMegabytes = (bytes) => Number((bytes / 1024 / 1024).toFixed(2));

export const getSystemHealth = async () => {
  const memory = process.memoryUsage();

  const [activeUsers, suspendedUsers] = await Promise.all([
    User.countDocuments({ accountStatus: "active" }),
    User.countDocuments({ accountStatus: { $in: ["suspended", "banned"] } }),
  ]);

  return {
    status: mongoose.connection.readyState === 1 ? "operational" : "degraded",
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    runtime: {
      nodeVersion: process.version,
      platform: process.platform,
      pid: process.pid,
    },
    database: {
      state: resolveDatabaseState(mongoose.connection.readyState),
      host: mongoose.connection.host || "unknown",
      name: mongoose.connection.name || "unknown",
    },
    memory: {
      rssMb: toMegabytes(memory.rss),
      heapUsedMb: toMegabytes(memory.heapUsed),
      heapTotalMb: toMegabytes(memory.heapTotal),
      externalMb: toMegabytes(memory.external),
    },
    users: {
      active: activeUsers,
      restricted: suspendedUsers,
    },
  };
};

export const listUsers = async (query) => {
  const { page, limit, search, kycStatus, accountStatus } = query;
  const filter = {};

  if (search) {
    filter.$or = [
      { fullName: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
    ];
  }

  if (kycStatus) filter.kycStatus = kycStatus;
  if (accountStatus) filter.accountStatus = accountStatus;

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    User.find(filter).sort("-createdAt").skip(skip).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    data,
    pagination: {
      page,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const listKycSubmissions = async (query = {}) => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const search = String(query.search || "").trim();
  const status = normalizeStatus(query.status);

  const filter = {
    kycSubmittedAt: { $exists: true, $ne: null },
  };

  if (status) {
    filter.kycStatus = status;
  } else {
    filter.kycStatus = { $in: ["pending", "approved", "rejected"] };
  }

  if (search) {
    const rx = new RegExp(search, "i");
    filter.$or = [
      { fullName: rx },
      { username: rx },
      { email: rx },
      { kycDocumentType: rx },
    ];
  }

  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    User.find(filter)
      .sort("-kycSubmittedAt")
      .skip(skip)
      .limit(limit)
      .select(
        "fullName username email role accountStatus kycStatus kycDocumentType kycDocumentNumber kycDocuments kycSubmittedAt kycReviewedAt kycReviewedBy kycRejectionReason kycAutomation kycReviewHistory",
      )
      .populate("kycReviewedBy", "fullName username role")
      .lean(),
    User.countDocuments(filter),
  ]);

  return {
    data: data.map((user) => ({
      _id: user._id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      accountStatus: user.accountStatus,
      kyc: {
        status: user.kycStatus || "not_submitted",
        documentType: user.kycDocumentType || "",
        documentNumberMasked: maskDocumentNumber(user.kycDocumentNumber || ""),
        documents: Array.isArray(user.kycDocuments) ? user.kycDocuments : [],
        submittedAt: user.kycSubmittedAt || null,
        reviewedAt: user.kycReviewedAt || null,
        reviewedBy: user.kycReviewedBy || null,
        rejectionReason: user.kycRejectionReason || "",
        automation: user.kycAutomation || null,
        auditTrail: Array.isArray(user.kycReviewHistory)
          ? user.kycReviewHistory.slice(-10).reverse()
          : [],
      },
    })),
    pagination: {
      page,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const reviewKycSubmission = async (adminUser, userId, payload = {}) => {
  ensure(adminUser?._id, "Unauthorized", 401);

  const decision = normalizeStatus(payload.decision);
  const reason = String(payload.reason || "")
    .trim()
    .slice(0, 300);

  ensure(
    ["approved", "rejected"].includes(decision),
    "Invalid KYC decision",
    400,
  );
  if (decision === "rejected") {
    ensure(
      reason.length >= 5,
      "Rejection reason must be at least 5 characters",
      400,
    );
  }

  const user = await User.findById(userId).select(
    "fullName username email kycStatus isKYCVerified kycDocuments kycDocumentType kycDocumentNumber kycReviewHistory",
  );
  ensure(user, "User not found", 404);
  ensure(
    Array.isArray(user.kycDocuments) && user.kycDocuments.length > 0,
    "User has no submitted KYC documents",
    400,
  );

  const now = new Date();
  user.kycStatus = decision;
  user.isKYCVerified = decision === "approved";
  user.kycRejectionReason = decision === "rejected" ? reason : "";
  user.kycReviewedAt = now;
  user.kycReviewedBy = adminUser._id;

  if (!Array.isArray(user.kycReviewHistory)) {
    user.kycReviewHistory = [];
  }

  user.kycReviewHistory.push({
    status: decision,
    reason:
      decision === "approved" ? reason || "Approved by admin review" : reason,
    actor: adminUser._id,
    actorRole: adminUser.role === "superadmin" ? "superadmin" : "admin",
    source: "manual_review",
    createdAt: now,
  });

  if (user.kycReviewHistory.length > 20) {
    user.kycReviewHistory = user.kycReviewHistory.slice(-20);
  }

  await user.save();

  await Notification.create({
    user: user._id,
    type: "kyc",
    title: decision === "approved" ? "KYC Approved" : "KYC Rejected",
    body:
      decision === "approved"
        ? "Your identity verification has been approved."
        : `Your KYC submission was rejected: ${reason}`,
    link: "/settings/profile",
    metadata: {
      reviewedBy: adminUser._id,
      decision,
      reason,
    },
  });

  return {
    _id: user._id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    kycStatus: user.kycStatus,
    isKYCVerified: user.isKYCVerified,
    kycReviewedAt: user.kycReviewedAt,
    kycRejectionReason: user.kycRejectionReason,
  };
};

export const updateUserStatus = async (id, accountStatus) => {
  const user = await User.findByIdAndUpdate(
    id,
    { $set: { accountStatus } },
    { new: true },
  ).lean();

  ensure(user, "User not found", 404);
  return user;
};

export const deleteUserByAdmin = async (adminUser, id, payload = {}) => {
  ensure(adminUser?._id, "Unauthorized", 401);

  const reason = String(payload.reason || "").trim();
  ensure(
    reason.length >= 5,
    "Deletion reason must be at least 5 characters",
    400,
  );

  const target = await User.findById(id).select(
    "_id fullName username email role accountStatus",
  );
  ensure(target, "User not found", 404);

  ensure(
    String(target._id) !== String(adminUser._id),
    "Use account settings to delete your own account",
    400,
  );

  if (target.role === "superadmin") {
    ensure(
      adminUser.role === "superadmin",
      "Only superadmin can delete superadmin accounts",
      403,
    );
  }

  const cleanup = await purgeUserAccountData(target._id);

  return {
    deletedUser: {
      _id: target._id,
      fullName: target.fullName,
      username: target.username,
      email: target.email,
      role: target.role,
    },
    reason,
    cleanup,
  };
};

export const listDisputes = async (query = {}) => {
  const { status, page = 1, limit = 20 } = query;
  const filter = { ...DISPUTE_STATUS_FILTER };

  if (status === "open") {
    filter.status = "disputed";
  }

  if (status === "under_review") {
    filter.status = "in_progress";
  }

  if (status === "resolved") {
    filter.status = { $in: RESOLVED_ORDER_STATUSES };
  }

  if (status === "closed") {
    filter.status = {
      $nin: ["disputed", "in_progress", ...RESOLVED_ORDER_STATUSES],
    };
  }

  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort("-updatedAt")
      .skip(skip)
      .limit(limit)
      .populate("buyer", "fullName username")
      .populate("seller", "fullName username")
      .populate("statusHistory.by", "fullName username")
      .populate("disputeAudit.resolvedBy", "fullName username")
      .lean(),
    Order.countDocuments(filter),
  ]);

  const data = orders.map((order) => {
    const history = order.statusHistory || [];
    const disputeEvents = history
      .filter((entry) => entry.status === "disputed")
      .sort(
        (left, right) =>
          new Date(left.timestamp).getTime() -
          new Date(right.timestamp).getTime(),
      );

    const latestDispute = disputeEvents[disputeEvents.length - 1] || null;
    const buyer = asPublicUser(order.buyer);
    const seller = asPublicUser(order.seller);

    let raisedBy = buyer;
    if (latestDispute?.by?._id) {
      if (sameObjectId(latestDispute.by._id, buyer?._id)) raisedBy = buyer;
      else if (sameObjectId(latestDispute.by._id, seller?._id))
        raisedBy = seller;
      else raisedBy = asPublicUser(latestDispute.by);
    }

    const against = sameObjectId(raisedBy?._id, buyer?._id) ? seller : buyer;
    const auditTrail = order.disputeAudit || [];
    const latestAudit = auditTrail[auditTrail.length - 1] || null;
    const auditEntries = auditTrail
      .slice()
      .sort(
        (left, right) =>
          new Date(right.resolvedAt).getTime() -
          new Date(left.resolvedAt).getTime(),
      )
      .map((entry) => ({
        previousStatus: entry.previousStatus || null,
        resolution: entry.resolution || null,
        note: entry.note || null,
        resolvedAt: entry.resolvedAt || null,
        resolvedByRole: entry.resolvedByRole || "admin",
        resolvedBy: asPublicUser(entry.resolvedBy),
      }));

    return {
      _id: order._id,
      status: toDisputeViewStatus(order.status),
      reason: latestDispute?.note || "Order marked as disputed",
      description: latestDispute?.note || "",
      createdAt: latestDispute?.timestamp || order.updatedAt || order.createdAt,
      raisedBy,
      against,
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
      },
      audit: {
        count: auditTrail.length,
        latest: latestAudit
          ? {
              previousStatus: latestAudit.previousStatus || null,
              resolution: latestAudit.resolution || null,
              note: latestAudit.note || null,
              resolvedAt: latestAudit.resolvedAt || null,
              resolvedByRole: latestAudit.resolvedByRole || "admin",
              resolvedBy: asPublicUser(latestAudit.resolvedBy),
            }
          : null,
        entries: auditEntries,
      },
    };
  });

  return {
    data,
    pagination: {
      page,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const resolveDispute = async (adminUser, orderId, payload) => {
  const { resolution, note } = payload;

  const order = await Order.findById(orderId)
    .populate("buyer", "fullName username email")
    .populate("seller", "fullName username email");

  ensure(order, "Disputed order not found", 404);

  const hasDispute =
    order.status === "disputed" ||
    (order.statusHistory || []).some((entry) => entry.status === "disputed");
  ensure(hasDispute, "Order has no dispute to resolve", 400);

  const now = new Date();
  const previousStatus = order.status;
  const resolverName = adminUser?.fullName || "Hupfumi Support";
  const resolverRole =
    adminUser?.role === "superadmin"
      ? "superadmin"
      : adminUser?._id
        ? "admin"
        : "system";
  const noteText = note || `Dispute updated by ${resolverName}`;

  order.status = resolution;

  if (resolution === "completed") {
    order.completedAt = now;
    if (["pending", "processing"].includes(order.paymentStatus)) {
      order.paymentStatus = "paid";
    }
  }

  if (resolution === "cancelled") {
    order.cancelledAt = now;
  }

  if (resolution === "refunded") {
    order.cancelledAt = now;
    order.paymentStatus = "refunded";
  }

  order.statusHistory.push({
    status: resolution,
    note: noteText,
    timestamp: now,
    by: adminUser?._id,
  });

  if (!Array.isArray(order.disputeAudit)) {
    order.disputeAudit = [];
  }

  order.disputeAudit.push({
    previousStatus,
    resolution,
    note: noteText,
    resolvedAt: now,
    resolvedBy: adminUser?._id,
    resolvedByRole: resolverRole,
  });

  await order.save();

  const recipients = [order.buyer, order.seller].filter(Boolean);
  const humanStatus = resolution.replace(/_/g, " ");

  await Promise.all(
    recipients.map((recipient) =>
      Notification.create({
        user: recipient._id,
        type: "order_update",
        title: "Dispute Update",
        body: `Support set order ${order.orderNumber} to ${humanStatus}.`,
        link: `/orders/${order._id}`,
      }),
    ),
  );

  await Promise.all(
    recipients.map((recipient) =>
      sendAdminEmailSafely("dispute resolution", async () => {
        if (!recipient?.email) return;

        await sendOrderStatusUpdateEmail({
          to: recipient.email,
          fullName: recipient.fullName,
          orderNumber: order.orderNumber,
          status: resolution,
          note: noteText,
          updatedBy: resolverName,
          orderId: order._id,
        });
      }),
    ),
  );

  return order;
};

export const listContentQueue = async (query = {}) => {
  const type = normalizeStatus(query.type || "all").toLowerCase() || "all";
  const moderationStatus = normalizeStatus(query.moderationStatus);
  const listingStatus = normalizeStatus(query.status);
  const search = String(query.search || "")
    .trim()
    .slice(0, 120);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));

  const requestedTypes =
    type === "all"
      ? ["job", "service", "product"]
      : [type].filter((entry) => Boolean(CONTENT_CONFIG[entry]));
  ensure(requestedTypes.length > 0, "Invalid content type", 400);

  const ownerIds = [];
  if (search) {
    const ownerMatches = await User.find({
      $or: [
        { fullName: new RegExp(search, "i") },
        { username: new RegExp(search, "i") },
        { email: new RegExp(search, "i") },
      ],
    })
      .select("_id")
      .limit(30)
      .lean();

    ownerIds.push(...ownerMatches.map((entry) => entry._id));
  }

  const fetchByType = async (entryType, pagination = true) => {
    const cfg = CONTENT_CONFIG[entryType];
    const filter = {};

    if (moderationStatus) {
      filter["moderation.status"] = moderationStatus;
    }

    if (listingStatus) {
      filter.status = listingStatus;
    }

    if (search) {
      const rx = new RegExp(search, "i");
      const ownerClause = ownerIds.length
        ? [{ [cfg.ownerField]: { $in: ownerIds } }]
        : [];

      filter.$or = [
        { title: rx },
        { description: rx },
        { category: rx },
        ...ownerClause,
      ];
    }

    const baseQuery = cfg.model
      .find(filter)
      .sort("-updatedAt")
      .populate(cfg.ownerField, cfg.ownerSelect)
      .lean();

    if (pagination) {
      const skip = (page - 1) * limit;
      const [rows, total] = await Promise.all([
        baseQuery.clone().skip(skip).limit(limit),
        cfg.model.countDocuments(filter),
      ]);
      return {
        rows: rows.map((row) => toContentView(entryType, row)),
        total,
      };
    }

    const rows = await baseQuery.limit(Math.max(40, limit * 3));
    return {
      rows: rows.map((row) => toContentView(entryType, row)),
      total: rows.length,
    };
  };

  if (requestedTypes.length === 1) {
    const result = await fetchByType(requestedTypes[0], true);
    return {
      data: result.rows,
      pagination: {
        page,
        total: result.total,
        pages: Math.ceil(result.total / limit),
      },
    };
  }

  const merged = await Promise.all(
    requestedTypes.map((entryType) => fetchByType(entryType, false)),
  );

  const allRows = merged
    .flatMap((entry) => entry.rows)
    .sort(
      (left, right) =>
        new Date(right.updatedAt).getTime() -
        new Date(left.updatedAt).getTime(),
    );

  const total = allRows.length;
  const start = (page - 1) * limit;

  return {
    data: allRows.slice(start, start + limit),
    pagination: {
      page,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

export const moderateContentItem = async (
  adminUser,
  type,
  itemId,
  payload = {},
) => {
  ensure(adminUser?._id, "Unauthorized", 401);

  const cfg = CONTENT_CONFIG[type];
  ensure(cfg, "Invalid content type", 400);

  const action = normalizeStatus(payload.action);
  const reason = String(payload.reason || "")
    .trim()
    .slice(0, 300);
  ensure(
    ["approve", "flag", "remove", "restore"].includes(action),
    "Invalid moderation action",
    400,
  );

  if (["flag", "remove"].includes(action)) {
    ensure(
      reason.length >= 5,
      "Moderation reason must be at least 5 characters",
      400,
    );
  }

  const item = await cfg.model
    .findById(itemId)
    .populate(cfg.ownerField, cfg.ownerSelect);
  ensure(item, "Content not found", 404);

  if (!item.moderation || typeof item.moderation !== "object") {
    item.moderation = {
      status: "approved",
      score: 0,
      reasons: [],
      lastScannedAt: new Date(),
    };
  }

  const now = new Date();
  let eventAction = "approved";
  let severity = "low";
  let eventStatus = "resolved";

  if (action === "approve") {
    item.moderation.status = "approved";
    item.moderation.reasons = [];
    if (item.status === cfg.removeStatus) {
      item.status = cfg.restoreStatus;
    }
    eventAction = "approved";
    severity = "low";
    eventStatus = "resolved";
  }

  if (action === "flag") {
    item.moderation.status = "pending_review";
    item.moderation.reasons = [reason];
    item.moderation.flaggedAt = now;
    eventAction = "flagged";
    severity = "medium";
    eventStatus = "open";
  }

  if (action === "remove") {
    item.moderation.status = "blocked";
    item.moderation.reasons = [reason];
    item.moderation.flaggedAt = now;
    item.status = cfg.removeStatus;
    eventAction = "removed";
    severity = "high";
    eventStatus = "resolved";
  }

  if (action === "restore") {
    item.moderation.status = "approved";
    item.moderation.reasons = [];
    if (item.status === cfg.removeStatus) {
      item.status = cfg.restoreStatus;
    }
    eventAction = "restored";
    severity = "low";
    eventStatus = "resolved";
  }

  item.moderation.reviewedAt = now;
  item.moderation.reviewedBy = adminUser._id;
  item.moderation.lastScannedAt = now;

  await item.save();

  const owner = item[cfg.ownerField];
  const ownerId = owner?._id || owner || null;

  await createModerationEvent({
    entityType: type,
    entityId: item._id,
    contentOwner: ownerId,
    origin: "admin",
    action: eventAction,
    severity,
    score: Number(item.moderation?.score || 0),
    reasons: item.moderation?.reasons || [],
    snapshot: {
      title: item.title,
      category: item.category,
      excerpt: item.description,
    },
    note: reason,
    reviewedBy: adminUser._id,
    status: eventStatus,
  });

  if (ownerId) {
    await Notification.create({
      user: ownerId,
      type: "system",
      title: "Listing Moderation Update",
      body:
        action === "approve"
          ? `Your ${type} listing was approved.`
          : action === "flag"
            ? `Your ${type} listing is pending review: ${reason}`
            : action === "remove"
              ? `Your ${type} listing was removed: ${reason}`
              : `Your ${type} listing was restored.`,
      link: cfg.link(item.slug),
      metadata: {
        type,
        itemId: String(item._id),
        action,
        reason,
      },
    });
  }

  return toContentView(type, {
    ...item.toObject(),
    [cfg.ownerField]: owner,
  });
};
