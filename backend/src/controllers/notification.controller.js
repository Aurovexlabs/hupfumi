import { z } from "zod";
import {
  getUnreadCount,
  listNotifications,
  markRead,
  removeNotification,
} from "../services/notification.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok, paginated } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const markReadSchema = z.object({
  ids: z.union([z.literal("all"), z.array(objectIdSchema)]),
});

export const getNotificationList = async (req, res) => {
  try {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid pagination query", 400);

    const result = await listNotifications(req.user._id, parsed.data);
    return paginated(res, result.data, result.pagination);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getNotificationUnreadCount = async (req, res) => {
  try {
    const data = await getUnreadCount(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const patchNotificationRead = async (req, res) => {
  try {
    const parsed = markReadSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid read payload", 400);

    await markRead(req.user._id, parsed.data.ids);
    return ok(res, null, "Marked as read");
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const parsed = objectIdSchema.safeParse(req.params.id);
    if (!parsed.success) return fail(res, "Invalid notification id", 400);

    await removeNotification(req.user._id, parsed.data);
    return ok(res, null, "Deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
