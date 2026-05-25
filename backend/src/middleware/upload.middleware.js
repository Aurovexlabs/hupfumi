import multer from "multer";
import { fail } from "../utils/response.js";

const memoryStorage = multer.memoryStorage();

const avatarMimeTypes = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

const kycMimeTypes = new Set([...avatarMimeTypes, "application/pdf"]);

const genericMimeTypes = new Set([...kycMimeTypes, "image/gif"]);

const createUpload = ({ maxFileSize, maxFiles, allowedMimeTypes }) =>
  multer({
    storage: memoryStorage,
    limits: {
      fileSize: maxFileSize,
      files: maxFiles,
    },
    fileFilter: (_req, file, cb) => {
      if (!allowedMimeTypes.has(file.mimetype)) {
        return cb(new Error("Unsupported file type"));
      }

      return cb(null, true);
    },
  });

export const avatarUpload = createUpload({
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 1,
  allowedMimeTypes: avatarMimeTypes,
}).single("avatar");

export const kycUpload = createUpload({
  maxFileSize: 10 * 1024 * 1024,
  maxFiles: 5,
  allowedMimeTypes: kycMimeTypes,
}).array("documents", 5);

export const genericSingleUpload = createUpload({
  maxFileSize: 15 * 1024 * 1024,
  maxFiles: 1,
  allowedMimeTypes: genericMimeTypes,
}).single("file");

export const runUpload = (uploader) => (req, res, next) => {
  uploader(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      return fail(res, error.message || "File upload error", 400);
    }

    return fail(res, error.message || "File upload failed", 400);
  });
};
