import {
  applyUserActivityAction,
  listUserActivities,
} from "../services/security.service.js";
import {
  deleteOwnAccount,
  getKycStatus,
  getPublicProfile,
  getUserWorkspace,
  saveUserWorkspaceListingNote,
  saveUserWorkspaceProductCompare,
  submitKyc,
  updateAvatar,
  updateProfile,
} from "../services/user.service.js";
import { fail, ok } from "../utils/response.js";

import { z } from "zod";
import { handleControllerError } from "../utils/controller.js";

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9_]+$/i);

const kycSchema = z.object({
  documentType: z.string().trim().min(2).max(64),
  documentNumber: z.string().trim().min(4).max(64),
});

const profilePatchSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    bio: z.string().trim().max(1200).optional(),
    skills: z.array(z.string().trim().min(1).max(60)).max(40).optional(),
    availabilityStatus: z.enum(["available", "busy", "offline"]).optional(),
    address: z
      .object({
        city: z.string().trim().max(120).optional(),
        province: z.string().trim().max(120).optional(),
        country: z.string().trim().max(120).optional(),
      })
      .optional(),
    profileType: z.enum(["individual", "freelancer", "business"]).optional(),
  })
  .strict();

const deleteAccountSchema = z.object({
  confirmation: z.literal("DELETE"),
  password: z.string().min(8).optional(),
});

const workspaceListingNoteSchema = z
  .object({
    type: z.enum(["job", "product", "service"]),
    listingId: z.string().trim().min(1).max(120),
    note: z.string().max(2000).default(""),
  })
  .strict();

const workspaceProductCompareItemSchema = z
  .object({
    id: z.string().trim().min(1).max(120),
    slug: z.string().trim().min(1).max(220),
    title: z.string().trim().min(1).max(220),
    price: z.coerce.number(),
    originalPrice: z.coerce.number().optional(),
    condition: z.string().trim().max(80).optional(),
    category: z.string().trim().max(80).optional(),
    rating: z.coerce.number().optional(),
    stock: z.coerce.number().optional(),
    imageUrl: z.string().trim().max(1200).optional(),
    sellerName: z.string().trim().max(120).optional(),
  })
  .strict();

const workspaceProductCompareSchema = z
  .object({
    items: z.array(workspaceProductCompareItemSchema).max(3),
  })
  .strict();

const listActivityQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  eventType: z
    .enum([
      "login_success",
      "login_challenge",
      "login_failed",
      "security_action",
    ])
    .optional(),
});

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const activityActionSchema = z.object({
  action: z.enum(["mark_safe", "report_suspicious", "lock_account"]),
  note: z.string().trim().max(300).optional(),
});

export const meKyc = (req, res) => {
  const data = getKycStatus(req.user);
  return ok(res, data);
};

export const publicProfile = async (req, res) => {
  try {
    const parsed = usernameSchema.safeParse(req.params.username);
    if (!parsed.success) return fail(res, "Invalid username", 400);

    const user = await getPublicProfile(parsed.data);
    return ok(res, user);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postKyc = async (req, res) => {
  try {
    const parsed = kycSchema.safeParse(req.body);
    if (!parsed.success)
      return fail(res, "documentType and documentNumber required", 400);

    const documents = Array.isArray(req.files) ? req.files : [];
    const data = await submitKyc(req.user._id, {
      ...parsed.data,
      documents,
    });
    return ok(res, data, "KYC submitted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchMeAvatar = async (req, res) => {
  try {
    if (!req.file) return fail(res, "Avatar file is required", 400);

    const data = await updateAvatar(req.user._id, req.file);
    return ok(res, data, "Avatar updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchMe = async (req, res) => {
  try {
    const parsed = profilePatchSchema.safeParse(req.body);
    if (!parsed.success)
      return fail(res, "Invalid profile update payload", 400);

    if (Object.keys(parsed.data).length === 0) {
      return fail(res, "No valid fields to update", 400);
    }

    const user = await updateProfile(req.user._id, parsed.data);
    return ok(res, user, "Profile updated");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMeWorkspace = async (req, res) => {
  try {
    const data = await getUserWorkspace(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const putMeWorkspaceListingNote = async (req, res) => {
  try {
    const parsed = workspaceListingNoteSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, "Invalid listing note payload", 400);
    }

    const data = await saveUserWorkspaceListingNote(req.user._id, parsed.data);
    return ok(res, data, "Workspace listing note synced");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const putMeWorkspaceProductCompare = async (req, res) => {
  try {
    const parsed = workspaceProductCompareSchema.safeParse(req.body);
    if (!parsed.success) {
      return fail(res, "Invalid product compare payload", 400);
    }

    const data = await saveUserWorkspaceProductCompare(
      req.user._id,
      parsed.data.items,
    );
    return ok(res, data, "Workspace compare synced");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const deleteMe = async (req, res) => {
  try {
    const parsed = deleteAccountSchema.safeParse(req.body);
    if (!parsed.success)
      return fail(
        res,
        "Provide confirmation=DELETE and current password if required",
        400,
      );

    const data = await deleteOwnAccount(req.user._id, parsed.data);
    res.clearCookie("refreshToken");
    return ok(res, data, "Account deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getMyActivity = async (req, res) => {
  try {
    const parsed = listActivityQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid activity query", 400);

    const result = await listUserActivities(req.user._id, parsed.data);
    return ok(res, result);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postMyActivityAction = async (req, res) => {
  try {
    const idParsed = objectIdSchema.safeParse(req.params.activityId);
    if (!idParsed.success) return fail(res, "Invalid activity id", 400);

    const bodyParsed = activityActionSchema.safeParse(req.body);
    if (!bodyParsed.success) return fail(res, "Invalid activity action", 400);

    const data = await applyUserActivityAction({
      userId: req.user._id,
      activityId: idParsed.data,
      action: bodyParsed.data.action,
      note: bodyParsed.data.note,
    });

    return ok(res, data, "Activity action saved");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
