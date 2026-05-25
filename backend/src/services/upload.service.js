import { AppError, ensure } from "../utils/appError.js";
import {
  deleteImageKitFile,
  getImageKitUploadAuth,
  uploadBufferToImageKit,
} from "./imagekit.service.js";

const cleanFileName = (name = "upload") =>
  String(name)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "_");

const toTagList = (tags) => {
  if (!tags) return [];
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean);
  }

  return String(tags)
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
};

export const getImageKitAuthPayload = () => getImageKitUploadAuth();

export const uploadUserAsset = async (userId, file, options = {}) => {
  ensure(file?.buffer, "File upload is required", 400);

  const folder = options.folder || `/hupfumi/users/${String(userId)}/uploads`;
  const fileName = `${Date.now()}-${cleanFileName(file.originalname || "file")}`;

  const uploaded = await uploadBufferToImageKit({
    buffer: file.buffer,
    fileName,
    mimeType: file.mimetype,
    folder,
    tags: toTagList(options.tags),
  });

  return {
    fileId: uploaded.fileId,
    url: uploaded.url,
    thumbnailUrl: uploaded.thumbnailUrl,
    filePath: uploaded.filePath,
    size: uploaded.size,
    mimeType: file.mimetype,
  };
};

export const removeUserAsset = async (fileId) => {
  ensure(fileId, "Missing file id", 400);

  const deleted = await deleteImageKitFile(fileId);

  if (!deleted) {
    throw new AppError("File not found", 404);
  }

  return { deleted: true };
};
