import ImageKit from "@imagekit/nodejs";
import crypto from "node:crypto";
import { AppError } from "../utils/appError.js";

const IMAGEKIT_PUBLIC_KEY = process.env.IMAGEKIT_PUBLIC_KEY?.trim();
const IMAGEKIT_PRIVATE_KEY = process.env.IMAGEKIT_PRIVATE_KEY?.trim();
const IMAGEKIT_URL_ENDPOINT = process.env.IMAGEKIT_URL_ENDPOINT?.trim();
const IMAGEKIT_WEBHOOK_SECRET = process.env.IMAGEKIT_WEBHOOK_SECRET?.trim();

export const isImageKitConfigured = () =>
  Boolean(IMAGEKIT_PUBLIC_KEY && IMAGEKIT_PRIVATE_KEY && IMAGEKIT_URL_ENDPOINT);

let imageKitClient = null;

const getImageKitClient = () => {
  if (!isImageKitConfigured()) {
    throw new AppError("ImageKit is not configured", 503);
  }

  if (!imageKitClient) {
    imageKitClient = new ImageKit({
      privateKey: IMAGEKIT_PRIVATE_KEY,
      webhookSecret: IMAGEKIT_WEBHOOK_SECRET || null,
    });
  }

  return imageKitClient;
};

export const getImageKitUploadAuth = () => {
  const client = getImageKitClient();
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 300;

  return {
    ...client.helper.getAuthenticationParameters(token, expire),
    publicKey: IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
  };
};

export const uploadBufferToImageKit = async ({
  buffer,
  fileName,
  mimeType,
  folder,
  tags,
  isPrivateFile = false,
}) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new AppError("Invalid file buffer", 400);
  }

  const client = getImageKitClient();
  const dataUri = `data:${mimeType || "application/octet-stream"};base64,${buffer.toString("base64")}`;

  const response = await client.files.upload({
    file: dataUri,
    fileName,
    folder,
    tags,
    useUniqueFileName: true,
    isPrivateFile,
  });

  return {
    fileId: response.fileId,
    name: response.name,
    url: response.url,
    filePath: response.filePath,
    thumbnailUrl: response.thumbnailUrl,
    size: response.size,
  };
};

export const deleteImageKitFile = async (fileId) => {
  if (!fileId || !isImageKitConfigured()) return false;

  const client = getImageKitClient();

  try {
    await client.files.delete(fileId);
    return true;
  } catch (error) {
    if (error?.status === 404) return false;
    throw error;
  }
};

export const buildImageKitUrl = ({
  src,
  transformation,
  signed,
  expiresIn,
}) => {
  const client = getImageKitClient();

  return client.helper.buildSrc({
    urlEndpoint: IMAGEKIT_URL_ENDPOINT,
    src,
    transformation,
    signed,
    expiresIn,
  });
};

export const unwrapImageKitWebhook = (rawBody, headers = {}) => {
  if (!rawBody || typeof rawBody !== "string") {
    throw new AppError("Missing webhook payload", 400);
  }

  const client = getImageKitClient();

  const normalizedHeaders = Object.entries(headers).reduce((acc, [k, v]) => {
    if (Array.isArray(v)) {
      acc[k] = v.join(",");
      return acc;
    }

    if (v === undefined || v === null) return acc;
    acc[k] = String(v);
    return acc;
  }, {});

  return client.webhooks.unwrap(rawBody, { headers: normalizedHeaders });
};
