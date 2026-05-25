import { z } from "zod";
import {
  getImageKitAuthPayload,
  removeUserAsset,
  uploadUserAsset,
} from "../services/upload.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const uploadBodySchema = z
  .object({
    folder: z.string().trim().max(180).optional(),
    tags: z.union([z.string(), z.array(z.string())]).optional(),
  })
  .partial();

const fileIdSchema = z.string().trim().min(6).max(200);

export const getImageKitAuth = async (_req, res) => {
  try {
    const data = getImageKitAuthPayload();
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postUploadAsset = async (req, res) => {
  try {
    const bodyParsed = uploadBodySchema.safeParse(req.body || {});
    if (!bodyParsed.success) return fail(res, "Invalid upload payload", 400);
    if (!req.file) return fail(res, "File upload is required", 400);

    const data = await uploadUserAsset(req.user._id, req.file, bodyParsed.data);
    return ok(res, data, "File uploaded", 201);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const deleteUploadAsset = async (req, res) => {
  try {
    const parsed = fileIdSchema.safeParse(req.params.fileId);
    if (!parsed.success) return fail(res, "Invalid file id", 400);

    const data = await removeUserAsset(parsed.data);
    return ok(res, data, "File deleted");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
