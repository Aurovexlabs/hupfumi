import {
  buildDisputeStatusUpdateEmailTemplate,
  buildOrderConfirmationEmailTemplate,
  buildOrderStatusUpdateEmailTemplate,
  buildPasswordResetEmailTemplate,
  buildPayoutNotificationEmailTemplate,
  buildSecurityLoginAlertEmailTemplate,
  buildTwoFactorOtpEmailTemplate,
  buildVerificationOtpEmailTemplate,
} from "./emailTemplates.js";

import nodemailer from "nodemailer";
import { AppError } from "../utils/appError.js";

const SMTP_HOST = process.env.SMTP_HOST?.trim();
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.trim();
const EMAIL_FROM =
  process.env.EMAIL_FROM?.trim() || SMTP_USER || "no-reply@hupfumi.com";
const CLIENT_URL = (process.env.CLIENT_URL || "http://localhost:5173").replace(
  /\/+$/,
  "",
);
const SECURITY_SETTINGS_URL = `${CLIENT_URL}/settings/profile`;

const isProduction = process.env.NODE_ENV === "production";

export const isEmailConfigured = () =>
  Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);

if (isProduction && !isEmailConfigured()) {
  throw new Error(
    "SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS are required in production",
  );
}

let transporter = null;
let transportVerified = false;

const getTransporter = () => {
  if (!isEmailConfigured()) {
    throw new AppError("Email delivery is not configured", 503);
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      tls: {
        minVersion: "TLSv1.2",
      },
    });
  }

  return transporter;
};

export const verifyEmailTransport = async () => {
  if (!isEmailConfigured() || transportVerified) return false;

  const mailer = getTransporter();
  await mailer.verify();
  transportVerified = true;
  return true;
};

const sendEmail = async ({ to, subject, text, html }) => {
  const mailer = getTransporter();

  return mailer.sendMail({
    from: EMAIL_FROM,
    to,
    subject,
    text,
    html,
  });
};

export const sendVerificationOtpEmail = async ({ to, fullName, otp }) => {
  const { subject, text, html } = buildVerificationOtpEmailTemplate({
    fullName,
    otp,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendTwoFactorOtpEmail = async ({
  to,
  fullName,
  otp,
  purpose = "login",
}) => {
  const { subject, text, html } = buildTwoFactorOtpEmailTemplate({
    fullName,
    otp,
    purpose,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendPasswordResetEmail = async ({ to, fullName, token }) => {
  const resetUrl = `${CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  const { subject, text, html } = buildPasswordResetEmailTemplate({
    fullName,
    resetUrl,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendOrderConfirmationEmail = async ({
  to,
  fullName,
  role = "buyer",
  orderNumber,
  listingTitle,
  total,
  paymentMethod,
  orderId,
}) => {
  const orderUrl = orderId
    ? `${CLIENT_URL}/orders/${encodeURIComponent(String(orderId))}`
    : `${CLIENT_URL}/orders`;

  const { subject, text, html } = buildOrderConfirmationEmailTemplate({
    fullName,
    role,
    orderNumber,
    listingTitle,
    total,
    paymentMethod,
    orderUrl,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendOrderStatusUpdateEmail = async ({
  to,
  fullName,
  orderNumber,
  status,
  note,
  updatedBy,
  orderId,
}) => {
  const orderUrl = orderId
    ? `${CLIENT_URL}/orders/${encodeURIComponent(String(orderId))}`
    : `${CLIENT_URL}/orders`;

  const { subject, text, html } = buildOrderStatusUpdateEmailTemplate({
    fullName,
    orderNumber,
    status,
    note,
    updatedBy,
    orderUrl,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendDisputeStatusUpdateEmail = async ({
  to,
  fullName,
  orderNumber,
  note,
  updatedBy,
  orderId,
}) => {
  const orderUrl = orderId
    ? `${CLIENT_URL}/orders/${encodeURIComponent(String(orderId))}`
    : `${CLIENT_URL}/orders`;

  const { subject, text, html } = buildDisputeStatusUpdateEmailTemplate({
    fullName,
    orderNumber,
    note,
    updatedBy,
    orderUrl,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendPayoutNotificationEmail = async ({
  to,
  fullName,
  amount,
  orderNumber,
}) => {
  const walletUrl = `${CLIENT_URL}/wallet`;

  const { subject, text, html } = buildPayoutNotificationEmailTemplate({
    fullName,
    amount,
    orderNumber,
    walletUrl,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};

export const sendSecurityLoginAlertEmail = async ({
  to,
  fullName,
  deviceType,
  browser,
  os,
  ipMasked,
  location,
  occurredAt,
}) => {
  const { subject, text, html } = buildSecurityLoginAlertEmailTemplate({
    fullName,
    deviceType,
    browser,
    os,
    ipMasked,
    location,
    occurredAt,
    securitySettingsUrl: SECURITY_SETTINGS_URL,
  });

  return sendEmail({
    to,
    subject,
    text,
    html,
  });
};
