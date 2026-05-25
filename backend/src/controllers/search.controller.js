import { z } from "zod";
import {
  getFeatured,
  getLeaderboard,
  getPlatformStats,
  getPopular,
  getRecommendations,
  getSuggestions,
  getTrending,
  search,
} from "../services/search.service.js";
import { ok } from "../utils/response.js";

const suggestionsQuerySchema = z.object({
  q: z.string().trim().optional(),
});

const searchQuerySchema = z.object({
  q: z.string().trim().optional(),
  type: z.enum(["jobs", "services", "products", "users"]).optional(),
});

const leaderboardQuerySchema = z.object({
  type: z.enum(["sellers", "services", "products"]).default("sellers"),
});

const recommendationsQuerySchema = z.object({
  limit: z.coerce.number().int().min(3).max(24).optional(),
});

export const getTrendingSearch = async (_req, res) => {
  try {
    const data = await getTrending();
    return ok(res, data);
  } catch {
    return ok(res, {
      trendingServices: [],
      trendingProducts: [],
      featuredJobs: [],
    });
  }
};

export const getPopularSearch = async (_req, res) => {
  try {
    const data = await getPopular();
    return ok(res, data);
  } catch {
    return ok(res, []);
  }
};

export const getSearchSuggestions = async (req, res) => {
  try {
    const parsed = suggestionsQuerySchema.safeParse(req.query);
    const q = parsed.success ? parsed.data.q : "";

    const data = await getSuggestions(q);
    return ok(res, data);
  } catch {
    return ok(res, { suggestions: [] });
  }
};

export const getSearchResults = async (req, res) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    const q = parsed.success ? parsed.data.q : "";
    const type = parsed.success ? parsed.data.type : undefined;

    const data = await search(q, type);
    return ok(res, data);
  } catch {
    return ok(res, { jobs: [], services: [], products: [], users: [] });
  }
};

export const getSearchLeaderboard = async (req, res) => {
  try {
    const parsed = leaderboardQuerySchema.safeParse(req.query);
    const type = parsed.success ? parsed.data.type : "sellers";

    const data = await getLeaderboard(type);
    return ok(res, data);
  } catch {
    return ok(res, []);
  }
};

export const getSearchFeatured = async (_req, res) => {
  try {
    const data = await getFeatured();
    return ok(res, data);
  } catch {
    return ok(res, {
      featuredJobs: [],
      featuredServices: [],
      featuredProducts: [],
    });
  }
};

export const getSearchPlatformStats = async (_req, res) => {
  try {
    const data = await getPlatformStats();
    return ok(res, data);
  } catch {
    return ok(res, {
      users: 10000,
      jobs: 5000,
      services: 3000,
      products: 8000,
      completedOrders: 25000,
    });
  }
};

export const getSearchRecommendations = async (req, res) => {
  try {
    const parsed = recommendationsQuerySchema.safeParse(req.query);
    const limit = parsed.success ? parsed.data.limit : undefined;

    const data = await getRecommendations(req.user, limit);
    return ok(res, data);
  } catch {
    return ok(res, {
      personalized: false,
      summary: {
        generatedAt: new Date().toISOString(),
        strategy: "fallback",
      },
      items: [],
      jobs: [],
      services: [],
      products: [],
    });
  }
};
