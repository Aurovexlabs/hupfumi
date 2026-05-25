import { z } from "zod";
import {
  isSaved,
  listSavedItems,
  toggleSavedItem,
} from "../services/saved.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/);
const refTypeSchema = z.enum(["job", "service", "product"]);

const listSavedQuerySchema = z.object({
  type: refTypeSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

const checkSavedQuerySchema = z.object({
  refType: refTypeSchema,
  refId: objectIdSchema,
});

const toggleSchema = z.object({
  refType: refTypeSchema,
  refId: objectIdSchema,
});

export const getSavedItems = async (req, res) => {
  try {
    const parsed = listSavedQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid saved items query", 400);

    const data = await listSavedItems(req.user._id, parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getSavedCheck = async (req, res) => {
  try {
    const parsed = checkSavedQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid saved check query", 400);

    const data = await isSaved(
      req.user._id,
      parsed.data.refType,
      parsed.data.refId,
    );
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postToggleSaved = async (req, res) => {
  try {
    const parsed = toggleSchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid refType", 400);

    const result = await toggleSavedItem(req.user._id, parsed.data);
    return ok(res, { saved: result.saved }, result.message);
  } catch (error) {
    return handleControllerError(res, error);
  }
};
