const BRAND_NAME = "Hupfumi";
const SUPPORT_EMAIL = "support@hupfumi.com";

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatCurrency = (value = 0) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0.00";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const humanizeStatus = (value = "") =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const renderEmailLayout = ({
  preheader,
  heading,
  greeting,
  bodyHtml,
  footerNote,
}) => `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="x-ua-compatible" content="ie=edge" />
    <title>${heading}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f3f4f6;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#111827;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${preheader}
    </span>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f3f4f6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:640px;background-color:#ffffff;border:1px solid #e5e7eb;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(120deg,#0f172a,#1f2937);padding:18px 24px;">
                <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.4px;">${BRAND_NAME}</p>
                <p style="margin:6px 0 0 0;font-size:12px;color:#d1d5db;">Secure marketplace notifications</p>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 28px 14px 28px;">
                <h1 style="margin:0 0 12px 0;font-size:24px;line-height:1.3;color:#0f172a;">${heading}</h1>
                <p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#374151;">${greeting}</p>
                ${bodyHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:0 28px 26px 28px;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">${footerNote}</p>
              </td>
            </tr>
            <tr>
              <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7280;">
                  Need help? Contact us at
                  <a href="mailto:${SUPPORT_EMAIL}" style="color:#ea580c;text-decoration:none;font-weight:600;">${SUPPORT_EMAIL}</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;

export const buildVerificationOtpEmailTemplate = ({ fullName, otp }) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeOtp = escapeHtml(otp);

  const subject = "Verify your Hupfumi account";
  const text = [
    `Hello ${recipientName},`,
    "",
    "Welcome to Hupfumi.",
    "Use the verification code below to activate your account:",
    otp,
    "",
    "This code expires in 10 minutes.",
    "If you did not create this account, you can ignore this message.",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Your verification code is ${otp}`,
    heading: "Verify your account",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        Use this one-time code to verify your email address and complete your account setup:
      </p>
      <div style="margin:0 0 14px 0;padding:16px 20px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:6px;color:#9a3412;">${safeOtp}</p>
      </div>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4b5563;">
        This code expires in <strong>10 minutes</strong> for your security.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
        If you did not request this, no action is required.
      </p>
    `,
    footerNote:
      "This is an automated email from Hupfumi. Please do not reply directly to this message.",
  });

  return { subject, text, html };
};

export const buildTwoFactorOtpEmailTemplate = ({
  fullName,
  otp,
  purpose = "login",
}) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeOtp = escapeHtml(otp);
  const isSetup = purpose === "setup";
  const isDisable = purpose === "disable";

  const subject = isSetup
    ? "Enable two-factor authentication"
    : isDisable
      ? "Confirm two-factor authentication disable"
      : "Your two-factor authentication code";

  const actionLabel = isSetup
    ? "enable two-factor authentication"
    : isDisable
      ? "disable two-factor authentication"
      : "finish signing in";

  const text = [
    `Hello ${recipientName},`,
    "",
    `Use this one-time code to ${actionLabel}:`,
    otp,
    "",
    "This code expires in 10 minutes.",
    "If this was not you, secure your account and contact support immediately.",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Your two-factor code is ${otp}`,
    heading: "Two-factor authentication",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        Use this one-time code to <strong>${escapeHtml(actionLabel)}</strong>:
      </p>
      <div style="margin:0 0 14px 0;padding:16px 20px;background-color:#fff7ed;border:1px solid #fed7aa;border-radius:10px;text-align:center;">
        <p style="margin:0;font-size:30px;font-weight:800;letter-spacing:6px;color:#9a3412;">${safeOtp}</p>
      </div>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4b5563;">
        This code expires in <strong>10 minutes</strong>.
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
        If you did not request this action, secure your account and contact support.
      </p>
    `,
    footerNote:
      "Two-factor codes are required for sensitive account actions and are never shared with support staff.",
  });

  return { subject, text, html };
};

export const buildPasswordResetEmailTemplate = ({ fullName, resetUrl }) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeResetUrl = escapeHtml(resetUrl);

  const subject = "Reset your Hupfumi password";
  const text = [
    `Hello ${recipientName},`,
    "",
    "We received a request to reset your Hupfumi password.",
    "Use the secure link below to continue:",
    resetUrl,
    "",
    "This link expires in 1 hour.",
    "If you did not request this change, you can ignore this email.",
  ].join("\n");

  const html = renderEmailLayout({
    preheader: "Reset your Hupfumi password",
    heading: "Password reset requested",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        We received a request to reset your password. Click the button below to continue.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:#ea580c;">
            <a href="${safeResetUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Reset Password
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:#4b5563;">
        If the button does not work, copy and paste this URL into your browser:
      </p>
      <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;word-break:break-all;">
        <a href="${safeResetUrl}" style="color:#c2410c;text-decoration:none;">${safeResetUrl}</a>
      </p>
      <p style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;">
        This reset link expires in <strong>1 hour</strong>.
      </p>
    `,
    footerNote:
      "If you did not request this password reset, your account remains secure and no action is required.",
  });

  return { subject, text, html };
};

export const buildOrderConfirmationEmailTemplate = ({
  fullName,
  role = "buyer",
  orderNumber,
  listingTitle,
  total,
  paymentMethod,
  orderUrl,
}) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeOrderNumber = escapeHtml(orderNumber || "Pending");
  const safeListingTitle = escapeHtml(listingTitle || "Marketplace order");
  const safePaymentMethod = escapeHtml(
    humanizeStatus(paymentMethod || "wallet"),
  );
  const safeOrderUrl = escapeHtml(orderUrl || "");
  const formattedTotal = formatCurrency(total);
  const isSeller = role === "seller";

  const subject = isSeller
    ? `New order received: ${orderNumber}`
    : `Order confirmed: ${orderNumber}`;

  const text = [
    `Hello ${recipientName},`,
    "",
    isSeller
      ? "A new order has been placed on your listing."
      : "Thank you for your order. Your payment has been recorded.",
    `Order Number: ${orderNumber}`,
    `Listing: ${listingTitle || "Marketplace order"}`,
    `Total: ${formattedTotal}`,
    `Payment Method: ${humanizeStatus(paymentMethod || "wallet")}`,
    "Track order details:",
    orderUrl,
    "",
    `Support: ${SUPPORT_EMAIL}`,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: isSeller
      ? `You received order ${safeOrderNumber}`
      : `Your order ${safeOrderNumber} is confirmed`,
    heading: isSeller ? "You received a new order" : "Your order is confirmed",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        ${
          isSeller
            ? "A buyer has submitted an order for your listing."
            : "Your order is now in the workflow. You can track all updates in your dashboard."
        }
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Order Number</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;background:#f9fafb;">${safeOrderNumber}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;">Listing</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;">${safeListingTitle}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Total</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;background:#f9fafb;">${formattedTotal}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;">Payment Method</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;">${safePaymentMethod}</td>
        </tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:#ea580c;">
            <a href="${safeOrderUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              View Order
            </a>
          </td>
        </tr>
      </table>
    `,
    footerNote:
      "All order activity is available in your dashboard. Keep communication and delivery milestones updated for smooth completion.",
  });

  return { subject, text, html };
};

export const buildOrderStatusUpdateEmailTemplate = ({
  fullName,
  orderNumber,
  status,
  note,
  updatedBy,
  orderUrl,
}) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeOrderNumber = escapeHtml(orderNumber || "Pending");
  const safeStatus = escapeHtml(humanizeStatus(status || "updated"));
  const safeOrderUrl = escapeHtml(orderUrl || "");
  const safeUpdatedBy = escapeHtml(updatedBy || "A participant");
  const safeNote = note ? escapeHtml(note) : "";

  const subject = `Order update: ${orderNumber} is ${humanizeStatus(status)}`;

  const text = [
    `Hello ${recipientName},`,
    "",
    `Order ${orderNumber} has a new status: ${humanizeStatus(status)}.`,
    `Updated by: ${updatedBy || "A participant"}`,
    ...(note ? [`Note: ${note}`] : []),
    "View order details:",
    orderUrl,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Order ${safeOrderNumber} status changed to ${safeStatus}`,
    heading: "Order status updated",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        There is an update on order <strong>${safeOrderNumber}</strong>.
      </p>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#374151;">
        New status:
        <span style="display:inline-block;margin-left:6px;padding:4px 8px;border-radius:999px;background:#fff7ed;border:1px solid #fdba74;color:#9a3412;font-weight:700;font-size:12px;">${safeStatus}</span>
      </p>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4b5563;">
        Updated by: <strong>${safeUpdatedBy}</strong>
      </p>
      ${
        safeNote
          ? `<p style="margin:0 0 14px 0;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;line-height:1.6;color:#4b5563;"><strong>Note:</strong> ${safeNote}</p>`
          : ""
      }
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:#ea580c;">
            <a href="${safeOrderUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Review Order Update
            </a>
          </td>
        </tr>
      </table>
    `,
    footerNote:
      "If this update requires your action, please respond promptly in the order workflow to avoid delays.",
  });

  return { subject, text, html };
};

export const buildDisputeStatusUpdateEmailTemplate = ({
  fullName,
  orderNumber,
  note,
  updatedBy,
  orderUrl,
}) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeOrderNumber = escapeHtml(orderNumber || "Pending");
  const safeOrderUrl = escapeHtml(orderUrl || "");
  const safeUpdatedBy = escapeHtml(updatedBy || "A participant");
  const safeNote = note
    ? escapeHtml(note)
    : "No additional details were provided.";

  const subject = `Dispute opened for order ${orderNumber}`;

  const text = [
    `Hello ${recipientName},`,
    "",
    `A dispute has been opened for order ${orderNumber}.`,
    `Updated by: ${updatedBy || "A participant"}`,
    `Details: ${note || "No additional details were provided."}`,
    "Please review the order timeline and provide any relevant evidence.",
    orderUrl,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Dispute opened for order ${safeOrderNumber}`,
    heading: "Dispute opened on an order",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        Order <strong>${safeOrderNumber}</strong> has been marked as disputed.
      </p>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4b5563;">
        Initiated by: <strong>${safeUpdatedBy}</strong>
      </p>
      <p style="margin:0 0 14px 0;padding:10px 12px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;font-size:13px;line-height:1.6;color:#4b5563;">
        <strong>Submitted details:</strong> ${safeNote}
      </p>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4b5563;">
        Review the order timeline and share complete evidence to support a fair resolution.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:#ea580c;">
            <a href="${safeOrderUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Open Disputed Order
            </a>
          </td>
        </tr>
      </table>
    `,
    footerNote:
      "Our support team may request additional details if needed. Timely responses help us resolve disputes faster.",
  });

  return { subject, text, html };
};

export const buildPayoutNotificationEmailTemplate = ({
  fullName,
  amount,
  orderNumber,
  walletUrl,
}) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeOrderNumber = escapeHtml(orderNumber || "Pending");
  const safeWalletUrl = escapeHtml(walletUrl || "");
  const formattedAmount = formatCurrency(amount);

  const subject = `Payout released: ${formattedAmount}`;

  const text = [
    `Hello ${recipientName},`,
    "",
    `A payout of ${formattedAmount} has been released to your wallet.`,
    `Order: ${orderNumber}`,
    "You can review your updated balance and transaction history here:",
    walletUrl,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: `Payout of ${formattedAmount} released`,
    heading: "Payout released to your wallet",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        Your payment for order <strong>${safeOrderNumber}</strong> has been processed.
      </p>
      <div style="margin:0 0 14px 0;padding:14px 16px;background:#ecfdf5;border:1px solid #86efac;border-radius:10px;">
        <p style="margin:0;font-size:14px;color:#166534;">Payout Amount</p>
        <p style="margin:4px 0 0 0;font-size:24px;font-weight:800;color:#166534;">${formattedAmount}</p>
      </div>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:#ea580c;">
            <a href="${safeWalletUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              View Wallet
            </a>
          </td>
        </tr>
      </table>
    `,
    footerNote:
      "Your wallet history shows full payout details, including references and settlement timestamps.",
  });

  return { subject, text, html };
};

export const buildSecurityLoginAlertEmailTemplate = ({
  fullName,
  deviceType,
  browser,
  os,
  ipMasked,
  location,
  occurredAt,
  securitySettingsUrl,
}) => {
  const recipientName = fullName || "there";
  const safeRecipientName = escapeHtml(recipientName);
  const safeDeviceType = escapeHtml(deviceType || "device");
  const safeBrowser = escapeHtml(browser || "Unknown browser");
  const safeOs = escapeHtml(os || "Unknown OS");
  const safeIpMasked = escapeHtml(ipMasked || "unknown");
  const safeLocation = escapeHtml(location || "Unknown location");
  const safeSecuritySettingsUrl = escapeHtml(securitySettingsUrl || "");
  const safeOccurredAt = escapeHtml(
    occurredAt ? new Date(occurredAt).toUTCString() : new Date().toUTCString(),
  );

  const subject = "Security alert: New device sign-in";

  const text = [
    `Hello ${recipientName},`,
    "",
    "We detected a sign-in from a new device on your account.",
    `Device: ${deviceType || "device"} (${browser || "Unknown browser"} on ${os || "Unknown OS"})`,
    `Location: ${location || "Unknown location"}`,
    `IP: ${ipMasked || "unknown"}`,
    `Time: ${new Date(occurredAt || Date.now()).toUTCString()}`,
    "",
    "If this was not you, review your security settings immediately and lock your account from activity history.",
    securitySettingsUrl,
  ].join("\n");

  const html = renderEmailLayout({
    preheader: "New device sign-in detected on your account",
    heading: "New device sign-in detected",
    greeting: `Hello ${safeRecipientName},`,
    bodyHtml: `
      <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#374151;">
        We detected a sign-in from a new device on your account.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 14px 0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">Device</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:700;color:#111827;background:#f9fafb;">${safeDeviceType} (${safeBrowser} on ${safeOs})</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;">Location</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;">${safeLocation}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;background:#f9fafb;">IP</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;background:#f9fafb;">${safeIpMasked}</td>
        </tr>
        <tr>
          <td style="padding:12px 14px;font-size:13px;color:#6b7280;">Time (UTC)</td>
          <td style="padding:12px 14px;font-size:13px;font-weight:600;color:#111827;">${safeOccurredAt}</td>
        </tr>
      </table>
      <p style="margin:0 0 14px 0;font-size:14px;line-height:1.6;color:#4b5563;">
        If this was not you, open security settings now and lock your account from the recent activity panel.
      </p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px 0;">
        <tr>
          <td align="center" style="border-radius:8px;background-color:#ea580c;">
            <a href="${safeSecuritySettingsUrl}" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">
              Review Security Activity
            </a>
          </td>
        </tr>
      </table>
    `,
    footerNote:
      "Security alerts are generated automatically when we detect a new device fingerprint on your account.",
  });

  return { subject, text, html };
};
