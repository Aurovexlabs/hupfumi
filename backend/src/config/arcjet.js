import arcjet, {
  detectBot,
  fixedWindow,
  shield,
  validateEmail,
} from "@arcjet/node";

const isProduction = process.env.NODE_ENV === "production";

const ARCJET_KEY = process.env.ARCJET_KEY?.trim();
const ARCJET_MODE =
  (process.env.ARCJET_MODE || (isProduction ? "LIVE" : "DRY_RUN")) === "LIVE"
    ? "LIVE"
    : "DRY_RUN";

const ARCJET_PROXIES = (process.env.ARCJET_PROXIES || "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const botAllowList = [
  "CATEGORY:SEARCH_ENGINE",
  "CATEGORY:MONITOR",
  "CATEGORY:PREVIEW",
  "CATEGORY:WEBHOOK",
];

const createBaseClient = () => {
  if (!ARCJET_KEY) return null;

  return arcjet({
    key: ARCJET_KEY,
    rules: [shield({ mode: ARCJET_MODE })],
    ...(ARCJET_PROXIES.length ? { proxies: ARCJET_PROXIES } : {}),
  });
};

const withAuthProtection = (client) =>
  client
    .withRule(
      detectBot({
        mode: ARCJET_MODE,
        allow: botAllowList,
      }),
    )
    .withRule(
      fixedWindow({
        mode: ARCJET_MODE,
        window: "60s",
        max: isProduction ? 40 : 120,
      }),
    );

const baseClient = createBaseClient();

export const isArcjetEnabled = Boolean(baseClient);
export const arcjetMode = ARCJET_MODE;

export const arcjetClients = {
  base: baseClient,
  auth: baseClient ? withAuthProtection(baseClient) : null,
  signup: baseClient
    ? withAuthProtection(baseClient).withRule(
        validateEmail({
          mode: ARCJET_MODE,
          deny: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
        }),
      )
    : null,
  wallet: baseClient
    ? baseClient.withRule(
        fixedWindow({
          mode: ARCJET_MODE,
          window: "60s",
          max: isProduction ? 30 : 100,
        }),
      )
    : null,
  uploads: baseClient
    ? baseClient
        .withRule(
          detectBot({
            mode: ARCJET_MODE,
            allow: botAllowList,
          }),
        )
        .withRule(
          fixedWindow({
            mode: ARCJET_MODE,
            window: "60s",
            max: isProduction ? 20 : 80,
          }),
        )
    : null,
};
