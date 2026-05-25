import ModerationEvent from "../models/ModerationEvent.js";
import { AppError } from "../utils/appError.js";

const HIGH_RISK_RULES = [
  {
    label: "Illegal goods or services",
    severity: "high",
    pattern:
      /\b(weapon|firearm|gun|ammunition|explosive|bomb|narcotic|heroin|cocaine|meth|counterfeit|fake\s*passport|stolen\s*cards?)\b/i,
  },
  {
    label: "Criminal or prohibited activity",
    severity: "high",
    pattern:
      /\b(money\s*laundering|ponzi|pyramid\s*scheme|human\s*trafficking|forged\s*documents?)\b/i,
  },
  {
    label: "Severe abusive content",
    severity: "high",
    pattern: /\b(kill|violent\s*attack|terror)\b/i,
  },
];

const MEDIUM_RISK_RULES = [
  {
    label: "Fraudulent or misleading language",
    severity: "medium",
    pattern:
      /\b(guaranteed\s*profit|double\s*your\s*money|no\s*risk\s*investment|instant\s*wealth|pay\s*before\s*delivery)\b/i,
  },
  {
    label: "Off-platform transaction pressure",
    severity: "medium",
    pattern:
      /\b(whatsapp|telegram|signal|dm\s*me|pay\s*outside\s*platform|bank\s*transfer\s*only)\b/i,
  },
  {
    label: "Potentially unsafe offering",
    severity: "medium",
    pattern:
      /\b(unsafe|unregulated|medical\s*cure\s*guaranteed|miracle\s*treatment)\b/i,
  },
];

const LOW_RISK_RULES = [
  {
    label: "Suspicious urgency wording",
    severity: "low",
    pattern:
      /\b(urgent\s*payment|limited\s*time\s*only|act\s*now|wire\s*immediately)\b/i,
  },
  {
    label: "Overly generic listing",
    severity: "low",
    pattern:
      /\b(best\s*service\s*ever|too\s*good\s*to\s*be\s*true|guaranteed\s*results)\b/i,
  },
];

const normalizeText = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

const asArrayText = (value) =>
  Array.isArray(value)
    ? value
        .map((entry) => normalizeText(entry))
        .filter(Boolean)
        .join(" ")
    : "";

const dedupe = (items = []) => [...new Set(items.filter(Boolean))];

const pushRuleMatch = (matches, rule, sourceText) => {
  const found = sourceText.match(rule.pattern);
  if (!found) return;

  matches.push({
    label: rule.label,
    severity: rule.severity,
    term: String(found[0] || "").slice(0, 120),
  });
};

const scoreForSeverity = (severity) => {
  if (severity === "high") return 100;
  if (severity === "medium") return 45;
  return 15;
};

export const scanListingModeration = (payload = {}) => {
  const text = normalizeText(
    [
      payload.title,
      payload.description,
      payload.category,
      asArrayText(payload.tags),
      asArrayText(payload.skills),
      asArrayText(payload.pricing?.map?.((tier) => tier?.description)),
      asArrayText(payload.faqs?.map?.((entry) => entry?.answer)),
    ].join(" "),
  ).toLowerCase();

  const matches = [];
  for (const rule of HIGH_RISK_RULES) pushRuleMatch(matches, rule, text);
  for (const rule of MEDIUM_RISK_RULES) pushRuleMatch(matches, rule, text);
  for (const rule of LOW_RISK_RULES) pushRuleMatch(matches, rule, text);

  const score = matches.reduce(
    (total, entry) => total + scoreForSeverity(entry.severity),
    0,
  );
  const reasons = dedupe(matches.map((entry) => entry.label));
  const terms = dedupe(matches.map((entry) => entry.term));

  let decision = "allow";
  if (matches.some((entry) => entry.severity === "high")) {
    decision = "block";
  } else if (
    matches.some((entry) => entry.severity === "medium") ||
    score >= 45
  ) {
    decision = "review";
  }

  return {
    decision,
    score,
    reasons,
    terms,
    severity:
      matches.find((entry) => entry.severity === "high")?.severity ||
      matches.find((entry) => entry.severity === "medium")?.severity ||
      matches.find((entry) => entry.severity === "low")?.severity ||
      "low",
  };
};

export const toModerationState = (scan = {}) => {
  const now = new Date();

  if (scan.decision === "review") {
    return {
      status: "pending_review",
      score: scan.score || 0,
      reasons: dedupe(scan.reasons || []),
      lastScannedAt: now,
      flaggedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    };
  }

  if (scan.decision === "block") {
    return {
      status: "blocked",
      score: scan.score || 0,
      reasons: dedupe(scan.reasons || []),
      lastScannedAt: now,
      flaggedAt: now,
      reviewedAt: null,
      reviewedBy: null,
    };
  }

  return {
    status: "approved",
    score: scan.score || 0,
    reasons: [],
    lastScannedAt: now,
    flaggedAt: null,
    reviewedAt: null,
    reviewedBy: null,
  };
};

export const assertNotBlockedByModeration = (scan, subject = "listing") => {
  if (scan?.decision === "block") {
    const reason = scan.reasons?.[0] || "policy violation";
    throw new AppError(
      `This ${subject} cannot be published because it contains prohibited content (${reason}).`,
      400,
    );
  }
};

export const createModerationEvent = async ({
  entityType,
  entityId,
  contentOwner,
  origin = "system",
  action,
  severity = "low",
  score = 0,
  reasons = [],
  snapshot = {},
  note = "",
  reviewedBy = null,
  status = "open",
}) => {
  if (!entityType || !entityId || !action) return null;

  return ModerationEvent.create({
    entityType,
    entityId: String(entityId),
    contentOwner: contentOwner || null,
    origin,
    action,
    severity,
    score,
    reasons: dedupe(reasons),
    snapshot: {
      title: normalizeText(snapshot.title).slice(0, 180),
      category: normalizeText(snapshot.category).slice(0, 120),
      excerpt: normalizeText(snapshot.excerpt).slice(0, 300),
    },
    note: normalizeText(note).slice(0, 300),
    reviewedBy,
    status,
  });
};

export const publicModerationClause = {
  $or: [
    { "moderation.status": "approved" },
    { "moderation.status": { $exists: false } },
  ],
};
