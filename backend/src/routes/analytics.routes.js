import { Router } from "express";
import {
  getListings,
  getOverview,
  getRadar,
  getRevenue,
  postRadarEvents,
} from "../controllers/analytics.controller.js";
import { protect, requireMarketplaceUser } from "../utils/auth.js";

const router = Router();
router.use(protect, requireMarketplaceUser);

router.get("/overview", getOverview);
router.get("/revenue", getRevenue);
router.get("/listings", getListings);
router.get("/opportunity-radar", getRadar);
router.post("/opportunity-radar/events", postRadarEvents);

export default router;
