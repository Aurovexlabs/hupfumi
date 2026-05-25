export const ok = (res, data, msg = "Success", code = 200) =>
  res.status(code).json({ success: true, message: msg, data });
export const fail = (res, msg, code = 400) => {
  const safeMessage = code >= 500 ? "Internal server error" : msg;
  const payload = { success: false, message: safeMessage };

  if (code >= 500 && process.env.NODE_ENV !== "production" && msg) {
    payload.details = String(msg);
  }

  return res.status(code).json(payload);
};
export const paginated = (res, data, pagination) =>
  res.json({ success: true, data, pagination });

export const buildPagination = (page, limit, total) => ({
  page: Number(page),
  limit: Number(limit),
  total,
  pages: Math.ceil(total / limit),
  hasPrev: Number(page) > 1,
  hasNext: Number(page) < Math.ceil(total / limit),
});
