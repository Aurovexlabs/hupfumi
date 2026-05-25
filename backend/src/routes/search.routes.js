import { Router } from "express";
import {
  getPopularSearch,
  getSearchFeatured,
  getSearchLeaderboard,
  getSearchPlatformStats,
  getSearchRecommendations,
  getSearchResults,
  getSearchSuggestions,
  getTrendingSearch,
} from "../controllers/search.controller.js";
import { optionalAuth } from "../utils/auth.js";

const router = Router();

router.get("/trending", getTrendingSearch);
router.get("/popular", getPopularSearch);
router.get("/suggestions", getSearchSuggestions);
router.get("/recommendations", optionalAuth, getSearchRecommendations);
router.get("/", getSearchResults);
router.get("/leaderboard", getSearchLeaderboard);
router.get("/featured", getSearchFeatured);
router.get("/platform-stats", getSearchPlatformStats);

export default router;
