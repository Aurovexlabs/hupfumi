import { z } from "zod";
import {
  getAnalyticsListings,
  getAnalyticsOverview,
  getAnalyticsRevenue,
  getOpportunityRadar,
  trackOpportunityRadarEvents,
} from "../services/analytics.service.js";
import { handleControllerError } from "../utils/controller.js";
import { fail, ok } from "../utils/response.js";

const revenueQuerySchema = z.object({
  period: z.coerce.number().int().min(1).max(365).optional(),
});

const radarQuerySchema = z.object({
  limit: z.coerce.number().int().min(4).max(24).optional(),
  page: z.coerce.number().int().min(1).max(200).optional(),
  types: z.string().trim().optional(),
  minScore: z.coerce.number().min(0).max(100).optional(),
});

const radarEventItemSchema = z.object({
  action: z.enum(["view", "click", "conversion"]),
  itemType: z.enum(["job", "service", "product"]),
  itemId: z.string().trim().min(1).max(120),
  category: z.string().trim().max(80).optional(),
  position: z.coerce.number().int().min(0).max(500).optional(),
  score: z.coerce.number().min(0).max(100).optional(),
  source: z.string().trim().max(40).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const radarEventsBodySchema = z.object({
  sessionId: z.string().trim().max(120).optional(),
  events: z.array(radarEventItemSchema).min(1).max(30),
});

export const getOverview = async (req, res) => {
  try {
    const data = await getAnalyticsOverview(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getRevenue = async (req, res) => {
  try {
    const parsed = revenueQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid revenue query", 400);

    const data = await getAnalyticsRevenue(req.user._id, parsed.data.period);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getListings = async (req, res) => {
  try {
    const data = await getAnalyticsListings(req.user._id);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const getRadar = async (req, res) => {
  try {
    const parsed = radarQuerySchema.safeParse(req.query);
    if (!parsed.success) return fail(res, "Invalid radar query", 400);

    const data = await getOpportunityRadar(req.user, parsed.data);
    return ok(res, data);
  } catch (error) {
    return handleControllerError(res, error);
  }
};

export const postRadarEvents = async (req, res) => {
  try {
    const parsed = radarEventsBodySchema.safeParse(req.body);
    if (!parsed.success) return fail(res, "Invalid radar events payload", 400);

    const data = await trackOpportunityRadarEvents(req.user._id, parsed.data);
    return ok(res, data, "Radar events tracked");
  } catch (error) {
    return handleControllerError(res, error);
  }
};
