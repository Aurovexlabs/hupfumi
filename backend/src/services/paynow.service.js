import crypto from "node:crypto";
import PaynowModule from "paynow";
import { AppError, ensure } from "../utils/appError.js";

const { Paynow } = PaynowModule;

const PAYNOW_INTEGRATION_ID = process.env.PAYNOW_INTEGRATION_ID?.trim();
const PAYNOW_INTEGRATION_KEY = process.env.PAYNOW_INTEGRATION_KEY?.trim();
const PAYNOW_RESULT_URL = process.env.PAYNOW_RESULT_URL?.trim();
const PAYNOW_RETURN_URL = process.env.PAYNOW_RETURN_URL?.trim();

const MOBILE_METHODS = new Set(["ecocash", "onemoney"]);

export const isPaynowConfigured = () =>
  Boolean(
    PAYNOW_INTEGRATION_ID &&
    PAYNOW_INTEGRATION_KEY &&
    PAYNOW_RESULT_URL &&
    PAYNOW_RETURN_URL,
  );

const decode = (value = "") => {
  try {
    return decodeURIComponent(String(value).replace(/\+/g, "%20"));
  } catch {
    return String(value);
  }
};

const buildClient = (returnUrlOverride) => {
  if (!isPaynowConfigured()) {
    throw new AppError("Paynow is not configured", 503);
  }

  return new Paynow(
    PAYNOW_INTEGRATION_ID,
    PAYNOW_INTEGRATION_KEY,
    PAYNOW_RESULT_URL,
    returnUrlOverride || PAYNOW_RETURN_URL,
  );
};

const buildReturnUrl = (reference) => {
  try {
    const url = new URL(PAYNOW_RETURN_URL);
    url.searchParams.set("reference", reference);
    return url.toString();
  } catch {
    const separator = PAYNOW_RETURN_URL.includes("?") ? "&" : "?";
    return `${PAYNOW_RETURN_URL}${separator}reference=${encodeURIComponent(reference)}`;
  }
};

const normalizePhone = (phone) => String(phone || "").replace(/\s+/g, "");

const toSafeNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizePaynowStatus = (status) =>
  String(status || "")
    .replace(/\+/g, " ")
    .trim()
    .toLowerCase();

export const createPaynowPayment = async ({
  reference,
  amount,
  email,
  method = "paynow",
  phone,
  additionalInfo,
}) => {
  ensure(reference, "Missing Paynow reference", 400);
  ensure(amount > 0, "Amount must be greater than zero", 400);

  const normalizedMethod = String(method || "paynow").toLowerCase();
  const client = buildClient(buildReturnUrl(reference));

  const payment = client.createPayment(reference, email || "");
  payment.add(additionalInfo || `Wallet deposit ${reference}`, Number(amount));

  let response;

  try {
    if (MOBILE_METHODS.has(normalizedMethod)) {
      ensure(
        phone,
        "A phone number is required for mobile Paynow payments",
        400,
      );
      response = await client.sendMobile(
        payment,
        normalizePhone(phone),
        normalizedMethod,
      );
    } else {
      response = await client.send(payment);
    }
  } catch (error) {
    throw new AppError(error?.message || "Failed to contact Paynow", 502);
  }

  ensure(response, "No response received from Paynow", 502);
  ensure(response.success, response.error || "Paynow request failed", 400);

  return {
    success: response.success,
    status: normalizePaynowStatus(response.status),
    redirectUrl: response.redirectUrl || null,
    instructions: response.instructions || null,
    pollUrl: response.pollUrl || null,
    hasRedirect: Boolean(response.hasRedirect),
    raw: response,
  };
};

export const pollPaynowTransaction = async (pollUrl) => {
  ensure(pollUrl, "Missing Paynow poll URL", 400);

  const client = buildClient();
  let response;

  try {
    response = await client.pollTransaction(pollUrl);
  } catch (error) {
    throw new AppError(error?.message || "Failed to poll Paynow", 502);
  }

  ensure(response, "No poll response received from Paynow", 502);

  return {
    status: normalizePaynowStatus(response.status),
    pollUrl: response.pollUrl || pollUrl,
    paynowReference:
      response.paynowReference || response.paynowreference || null,
    amount: toSafeNumber(response.amount),
    raw: response,
  };
};

const parseRawKeyValuePairs = (rawBody) => {
  const entries = [];

  for (const pair of String(rawBody || "").split("&")) {
    if (!pair) continue;

    const separatorIndex = pair.indexOf("=");
    const rawKey = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
    const rawValue =
      separatorIndex === -1 ? "" : pair.slice(separatorIndex + 1);
    const key = decode(rawKey).toLowerCase();

    entries.push({ key, value: decode(rawValue) });
  }

  return entries;
};

const parseObjectPairs = (body = {}) =>
  Object.entries(body).map(([key, value]) => ({
    key: String(key).toLowerCase(),
    value: decode(value),
  }));

const hashFromEntries = (entries) => {
  if (!PAYNOW_INTEGRATION_KEY) {
    throw new AppError("Paynow integration key is missing", 503);
  }

  const payload = entries
    .filter((entry) => entry.key !== "hash")
    .map((entry) => entry.value)
    .join("");

  return crypto
    .createHash("sha512")
    .update(`${payload}${PAYNOW_INTEGRATION_KEY.toLowerCase()}`, "utf8")
    .digest("hex")
    .toUpperCase();
};

const toDataObject = (entries) =>
  entries.reduce((acc, entry) => {
    acc[entry.key] = entry.value;
    return acc;
  }, {});

export const parseAndVerifyPaynowMessage = ({ rawBody, body }) => {
  ensure(isPaynowConfigured(), "Paynow is not configured", 503);

  const entries =
    typeof rawBody === "string" && rawBody.includes("=")
      ? parseRawKeyValuePairs(rawBody)
      : parseObjectPairs(body);

  const data = toDataObject(entries);
  const providedHash = String(data.hash || "").toUpperCase();

  ensure(providedHash, "Missing Paynow hash", 400);

  const expectedHash = hashFromEntries(entries);
  ensure(providedHash === expectedHash, "Invalid Paynow hash", 400);

  ensure(data.reference, "Missing Paynow reference", 400);
  ensure(data.status, "Missing Paynow status", 400);

  return {
    reference: data.reference,
    paynowReference: data.paynowreference || null,
    amount: toSafeNumber(data.amount),
    status: normalizePaynowStatus(data.status),
    pollUrl: data.pollurl || null,
    hash: providedHash,
    expectedHash,
    raw: data,
  };
};
