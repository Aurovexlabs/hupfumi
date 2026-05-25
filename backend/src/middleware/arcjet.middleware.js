import { fail } from "../utils/response.js";

const resolveDeniedStatus = (decision) => {
  if (decision?.reason?.isRateLimit?.()) return 429;
  return 403;
};

const resolveDeniedMessage = (decision, fallback) => {
  if (fallback) return fallback;
  if (decision?.reason?.isRateLimit?.()) {
    return "Too many requests. Please try again in a moment.";
  }
  if (decision?.reason?.isBot?.()) {
    return "Automated traffic is not allowed for this endpoint.";
  }
  if (decision?.reason?.isEmail?.()) {
    return "Email address validation failed.";
  }
  if (decision?.reason?.isShield?.()) {
    return "Request blocked by security policy.";
  }
  return "Request blocked by security policy.";
};

export const createArcjetMiddleware = (client, options = {}) => {
  const { buildProps, deniedMessage } = options;

  return async (req, res, next) => {
    if (!client) return next();

    try {
      const props =
        typeof buildProps === "function" ? buildProps(req) || {} : {};
      const decision = await client.protect(req, props);

      if (decision?.isErrored?.()) {
        console.error("Arcjet protect() error:", decision?.reason?.message);
        return next();
      }

      if (decision?.isDenied?.()) {
        return fail(
          res,
          resolveDeniedMessage(decision, deniedMessage),
          resolveDeniedStatus(decision),
        );
      }

      return next();
    } catch (error) {
      console.error("Arcjet middleware failed open:", error?.message || error);
      return next();
    }
  };
};
