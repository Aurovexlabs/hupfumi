import sanitizeHtml from "sanitize-html";

const RAW_FIELDS = new Set([
  "password",
  "token",
  "otp",
  "refreshToken",
  "accessToken",
  "authorization",
]);

const cleanString = (value, fieldName = "") => {
  const key = String(fieldName || "").toLowerCase();
  const normalized = value.replace(/\u0000/g, "").trim();

  if (!normalized) return "";
  if (RAW_FIELDS.has(key)) return normalized;

  return sanitizeHtml(normalized, {
    allowedTags: [],
    allowedAttributes: {},
  });
};

export const sanitizeValue = (value, fieldName = "") => {
  if (typeof value === "string") return cleanString(value, fieldName);

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, fieldName));
  }

  if (value && typeof value === "object") {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = sanitizeValue(nested, key);
    }
    return out;
  }

  return value;
};

export const sanitizeRequestPayload = (req, _res, next) => {
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }

  if (req.query && typeof req.query === "object") {
    req.query = sanitizeValue(req.query);
  }

  next();
};
