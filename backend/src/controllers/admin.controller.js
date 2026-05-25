import { z } from "zod";
import {
  deleteUserByAdmin,
  getDashboardMetrics,
  getSystemHealth,
  listContentQueue,
  listDisputes,
  listKycSubmissions,
  listUsers,
  moderateContentItem,
  resolveDispute,
  reviewKycSubmission,
  updateUserStatus,
} from "../services/admin.service.js";
import {
  listAdminAuditLogs,
  recordAdminAudit,
} from "../services/security.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  kycStatus: z.string().trim().max(32).optional(),
  accountStatus: z.string().trim().max(32).optional(),
});

const listKycQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  status: z
    .enum(["pending", "approved", "rejected", "not_submitted"])
    .optional(),
});

const reviewKycSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
  reason: z.string().trim().max(300).optional(),
});

const contentTypeSchema = z.enum(["job", "service", "product"]);

const listContentQuerySchema = z.object({
  type: z.enum(["all", "job", "service", "product"]).default("all"),
  moderationStatus: z
    .enum(["approved", "pending_review", "blocked"])
    .optional(),
  status: z.string().trim().max(50).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const moderateContentSchema = z.object({
  action: z.enum(["approve", "flag", "remove", "restore"]),
  reason: z.string().trim().max(300).optional(),
});

const patchStatusSchema = z.object({
  accountStatus: z.string().trim().min(1).max(32),
});

const deleteUserSchema = z.object({
  reason: z.string().trim().min(5).max(300),
});

const listDisputesQuerySchema = z.object({
  status: z.enum(["open", "under_review", "resolved", "closed"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const patchDisputeSchema = z.object({
  resolution: z.enum(["in_progress", "completed", "cancelled", "refunded"]),
  note: z.string().trim().max(500).optional(),
});

const listAuditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  action: z.string().trim().max(120).optional(),
});

const logAdminAuditSafely = async (req, config) => {
  try {
    await recordAdminAudit({ req, actor: req.user, ...config });
  } catch (error) {
    console.error("Failed to record admin audit:", error.message);
  }
};

export const getAdminDashboard = async (_req, res) => {
  try {
    const data = await getDashboardMetrics();
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAdminSystemHealth = async (_req, res) => {
  try {
    const data = await getSystemHealth();
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAdminUsers = async (req, res) => {
  try {
    const parsed = listUsersQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid users query", 400);

    const data = await listUsers(parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAdminKycSubmissions = async (req, res) => {
  try {
    const parsed = listKycQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid KYC query", 400);

    const data = await listKycSubmissions(parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchAdminKycSubmission = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid user id", 400);

    const bodyParsed = reviewKycSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid KYC review payload", 400);

    const result = await reviewKycSubmission(
      req.user,
      idParsed.data,
      bodyParsed.data,
    );

    await logAdminAuditSafely(req, {
      action: "admin_kyc_review",
      targetType: "user",
      targetId: idParsed.data,
      targetUser: idParsed.data,
      reason: bodyParsed.data.reason || `Decision: ${bodyParsed.data.decision}`,
      metadata: {
        decision: bodyParsed.data.decision,
      },
    });

    return ok(res, result, "KYC review updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAdminContentQueue = async (req, res) => {
  try {
    const parsed = listContentQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid content query", 400);

    const data = await listContentQueue(parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchAdminContentModeration = async (req, res) => {
  try {
    const typeParsed = contentTypeSchema.safeParse(req.params.type);
    if (!typeParsed.success) return fail(res, "Invalid content type", 400);

    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid content id", 400);

    const bodyParsed = moderateContentSchema.safeParse(req.body);
    if (!bodyParsed.success)
      return fail(res, "Invalid moderation payload", 400);

    const data = await moderateContentItem(
      req.user,
      typeParsed.data,
      idParsed.data,
      bodyParsed.data,
    );

    await logAdminAuditSafely(req, {
      action: "admin_content_moderation",
      targetType: typeParsed.data,
      targetId: idParsed.data,
      reason: bodyParsed.data.reason || `Action: ${bodyParsed.data.action}`,
      metadata: {
        contentType: typeParsed.data,
        action: bodyParsed.data.action,
      },
    });

    return ok(res, data, "Content moderation updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchAdminUserStatus = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid user id", 400);

    const bodyParsed = patchStatusSchema.safeParse(req.body);
    if (!bodyParsed.success) return fail(res, "Invalid status payload", 400);

    const user = await updateUserStatus(
      idParsed.data,
      bodyParsed.data.accountStatus,
    );

    await logAdminAuditSafely(req, {
      action: "admin_user_status_update",
      targetType: "user",
      targetId: idParsed.data,
      targetUser: idParsed.data,
      reason: `Set status to ${bodyParsed.data.accountStatus}`,
      metadata: {
        accountStatus: bodyParsed.data.accountStatus,
      },
    });

    return ok(res, user, "Status updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const deleteAdminUser = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid user id", 400);

    const bodyParsed = deleteUserSchema.safeParse(req.body);
    if (!bodyParsed.success) return fail(res, "Invalid delete payload", 400);

    const data = await deleteUserByAdmin(
      req.user,
      idParsed.data,
      bodyParsed.data,
    );

    await logAdminAuditSafely(req, {
      action: "admin_user_delete",
      targetType: "user",
      targetId: idParsed.data,
      targetUser: idParsed.data,
      reason: bodyParsed.data.reason,
      metadata: {
        deletedUser: data.deletedUser,
        cleanup: data.cleanup?.cleanup,
      },
    });

    return ok(res, data, "User deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAdminDisputes = async (req, res) => {
  try {
    const parsed = listDisputesQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid disputes query", 400);

    const data = await listDisputes(parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchAdminDispute = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.id);
    if (!idParsed.success) return fail(res, "Invalid dispute id", 400);

    const bodyParsed = patchDisputeSchema.safeParse(req.body);
    if (!bodyParsed.success) return fail(res, "Invalid dispute payload", 400);

    const order = await resolveDispute(
      req.user,
      idParsed.data,
      bodyParsed.data,
    );

    await logAdminAuditSafely(req, {
      action: "admin_dispute_update",
      targetType: "order",
      targetId: idParsed.data,
      reason:
        bodyParsed.data.note || `Resolution: ${bodyParsed.data.resolution}`,
      metadata: {
        resolution: bodyParsed.data.resolution,
      },
    });

    return ok(res, order, "Dispute updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getAdminAuditLogs = async (req, res) => {
  try {
    const parsed = listAuditQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid audit query", 400);

    const data = await listAdminAuditLogs(parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};
