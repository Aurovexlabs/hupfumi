import mongoose from "mongoose";
import Job from "../models/Job.js";
import OpportunityRadarEvent from "../models/OpportunityRadarEvent.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Review from "../models/Review.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import Service from "../models/Service.js";
import Transaction from "../models/Transaction.js";
import { publicModerationClause } from "./moderation.service.js";

export const getAnalyticsOverview = async (userId) => {
  const uid = new mongoose.Types.ObjectId(userId);
  const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalRev,
    monthRev,
    totalOrders,
    monthOrders,
    views,
    ratingAgg,
    completion,
  ] = await Promise.all([
    Transaction.aggregate([
      { $match: { user: uid, type: "payout", status: "completed" } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]).then((r) => r[0]?.total ?? 0),
    Transaction.aggregate([
      {
        $match: {
          user: uid,
          type: "payout",
          status: "completed",
          createdAt: { $gte: month },
        },
      },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]).then((r) => r[0]?.total ?? 0),
    Order.countDocuments({ seller: userId }),
    Order.countDocuments({ seller: userId, createdAt: { $gte: month } }),
    Service.aggregate([
      { $match: { seller: uid } },
      { $group: { _id: null, total: { $sum: "$stats.views" } } },
    ]).then((r) => r[0]?.total ?? 0),
    Review.aggregate([
      { $match: { reviewee: uid, isVisible: true } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]).then((r) => r[0] ?? { avg: 0, count: 0 }),
    Order.aggregate([
      { $match: { seller: uid, status: { $in: ["completed", "cancelled"] } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).then((r) => {
      const completed = r.find((x) => x._id === "completed")?.count ?? 0;
      const cancelled = r.find((x) => x._id === "cancelled")?.count ?? 0;
      return completed + cancelled > 0
        ? Math.round((completed / (completed + cancelled)) * 100)
        : 100;
    }),
  ]);

  return {
    revenue: { total: totalRev, thisMonth: monthRev },
    orders: { total: totalOrders, thisMonth: monthOrders },
    totalViews: views,
    rating: {
      avg: Math.round(ratingAgg.avg * 10) / 10,
      count: ratingAgg.count,
    },
    completionRate: completion,
  };
};

export const getAnalyticsRevenue = async (userId, periodDays) => {
  const days = Math.min(Number(periodDays ?? 30), 365);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const uid = new mongoose.Types.ObjectId(userId);

  const raw = await Transaction.aggregate([
    {
      $match: {
        user: uid,
        type: "payout",
        status: "completed",
        createdAt: { $gte: since },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: "$netAmount" },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const map = new Map(raw.map((r) => [r._id, r]));
  const chart = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    chart.push({
      date: key,
      revenue: map.get(key)?.revenue ?? 0,
      orders: map.get(key)?.orders ?? 0,
    });
  }

  const totals = chart.reduce(
    (acc, point) => ({
      revenue: acc.revenue + point.revenue,
      orders: acc.orders + point.orders,
    }),
    { revenue: 0, orders: 0 },
  );

  return {
    chart,
    totals,
    period: days,
  };
};

export const getAnalyticsListings = async (userId) => {
  const [services, products] = await Promise.all([
    Service.find({ seller: userId })
      .select("title slug status stats pricing images gallery")
      .sort("-stats.views")
      .limit(10)
      .lean(),
    Product.find({ seller: userId })
      .select("title slug status stats price images")
      .sort("-stats.views")
      .limit(10)
      .lean(),
  ]);

  return {
    services,
    products,
    jobs: [],
  };
};

const toIntEnv = (name, fallback, min, max) => {
  const raw = Number.parseInt(process.env[name] || "", 10);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(raw, max));
};

const RADAR_CACHE_TTL_MS =
  toIntEnv("OPPORTUNITY_RADAR_CACHE_TTL_SECONDS", 300, 30, 3600) * 1000;
const RADAR_CACHE_MAX_ENTRIES = toIntEnv(
  "OPPORTUNITY_RADAR_CACHE_MAX_ENTRIES",
  500,
  50,
  5000,
);
const RADAR_MAX_LIMIT = toIntEnv("OPPORTUNITY_RADAR_MAX_LIMIT", 24, 8, 50);
const RADAR_MAX_PAGE = toIntEnv("OPPORTUNITY_RADAR_MAX_PAGE", 20, 1, 200);
const RADAR_DEFAULT_MIN_SCORE = toIntEnv(
  "OPPORTUNITY_RADAR_DEFAULT_MIN_SCORE",
  0,
  0,
  90,
);
const RADAR_FEEDBACK_WINDOW_DAYS = toIntEnv(
  "OPPORTUNITY_RADAR_FEEDBACK_WINDOW_DAYS",
  30,
  1,
  180,
);
const radarCache = new Map();

const RADAR_SEGMENT_WEIGHTS = {
  new_seller: {
    relevance: 1.3,
    trend: 1.2,
    freshness: 1.15,
    demand: 0.9,
    urgency: 1.05,
    feedback: 0.7,
    featured: 1,
  },
  growth_seller: {
    relevance: 1.25,
    trend: 1.05,
    freshness: 0.95,
    demand: 1.15,
    urgency: 1.05,
    feedback: 1,
    featured: 1,
  },
  power_seller: {
    relevance: 1.1,
    trend: 0.95,
    freshness: 0.9,
    demand: 1.35,
    urgency: 1.1,
    feedback: 1.3,
    featured: 0.95,
  },
  business_builder: {
    relevance: 1.1,
    trend: 1.2,
    freshness: 1,
    demand: 1.2,
    urgency: 1,
    feedback: 1.1,
    featured: 1,
  },
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "your",
  "you",
  "have",
  "are",
  "our",
  "job",
  "service",
  "product",
  "will",
  "into",
  "has",
  "was",
  "been",
  "its",
  "their",
]);

const RADAR_EVENT_ACTIONS = new Set(["view", "click", "conversion"]);
const RADAR_ITEM_TYPES = new Set(["job", "service", "product"]);

const tokenize = (...values) => {
  const combined = values
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ");

  return combined
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
};

const toTokenSet = (...values) => new Set(tokenize(...values));

const intersectCount = (left, right) => {
  let count = 0;
  for (const token of left) {
    if (right.has(token)) count += 1;
  }
  return count;
};

const getRadarSegment = (user) => {
  const totalEarned = Number(user?.totalEarned || 0);
  const reviewCount = Number(user?.reviewCount || 0);
  const profileType = String(user?.profileType || "").toLowerCase();

  if (totalEarned >= 5000 || reviewCount >= 40) return "power_seller";
  if (profileType === "business") return "business_builder";
  if (totalEarned >= 500 || reviewCount >= 6) return "growth_seller";
  return "new_seller";
};

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(n, max));
};

const parseRadarTypes = (typesRaw) => {
  if (!typesRaw) return new Set(RADAR_ITEM_TYPES);

  const list = Array.isArray(typesRaw)
    ? typesRaw
    : String(typesRaw)
        .split(",")
        .map((value) => value.trim());

  const normalized = list
    .map((value) => String(value || "").toLowerCase())
    .filter((value) => RADAR_ITEM_TYPES.has(value));

  return normalized.length > 0
    ? new Set(normalized)
    : new Set(RADAR_ITEM_TYPES);
};

const toHoursSince = (dateLike) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / (1000 * 60 * 60);
};

const toHoursUntil = (dateLike) => {
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return Infinity;
  return (date.getTime() - Date.now()) / (1000 * 60 * 60);
};

const serviceMinPrice = (service) => {
  const tiers = Array.isArray(service?.pricing) ? service.pricing : [];
  if (!tiers.length) return 0;
  return tiers.reduce((min, tier) => {
    const value = Number(tier?.price || 0);
    if (!min) return value;
    return value > 0 && value < min ? value : min;
  }, 0);
};

const buildFeedbackMaps = (rows) => {
  const byTypeCategory = new Map();
  const byType = new Map();

  for (const row of rows) {
    const itemType = String(row?._id?.itemType || "");
    if (!RADAR_ITEM_TYPES.has(itemType)) continue;

    const category = String(row?._id?.category || "*") || "*";
    const views = Number(row?.views || 0);
    const clicks = Number(row?.clicks || 0);
    const conversions = Number(row?.conversions || 0);

    byTypeCategory.set(`${itemType}:${category}`, {
      views,
      clicks,
      conversions,
    });

    const typeBucket = byType.get(itemType) || {
      views: 0,
      clicks: 0,
      conversions: 0,
    };
    typeBucket.views += views;
    typeBucket.clicks += clicks;
    typeBucket.conversions += conversions;
    byType.set(itemType, typeBucket);
  }

  return { byTypeCategory, byType };
};

const feedbackToScore = (bucket) => {
  if (!bucket) return 0;

  const views = Math.max(1, Number(bucket.views || 0));
  const clicks = Number(bucket.clicks || 0);
  const conversions = Number(bucket.conversions || 0);

  const ctr = clicks / views;
  const conversionRate = clicks > 0 ? conversions / clicks : 0;

  return Math.min(8, ctr * 22 + conversionRate * 20);
};

const getFeedbackScore = ({ byTypeCategory, byType }, itemType, category) => {
  const normalizedCategory =
    String(category || "")
      .toLowerCase()
      .trim() || "*";
  const specific = byTypeCategory.get(`${itemType}:${normalizedCategory}`);
  const typeOnly = byType.get(itemType);

  const specificScore = feedbackToScore(specific);
  const typeScore = feedbackToScore(typeOnly) * 0.65;

  return Math.min(8, specificScore + typeScore);
};

const pruneRadarCache = () => {
  if (radarCache.size <= RADAR_CACHE_MAX_ENTRIES) return;

  const now = Date.now();
  for (const [key, value] of radarCache.entries()) {
    if (value.expiresAt <= now) {
      radarCache.delete(key);
    }
  }

  if (radarCache.size <= RADAR_CACHE_MAX_ENTRIES) return;

  const sortedByCreatedAt = [...radarCache.entries()].sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );

  while (
    radarCache.size > RADAR_CACHE_MAX_ENTRIES &&
    sortedByCreatedAt.length > 0
  ) {
    const oldest = sortedByCreatedAt.shift();
    if (oldest) radarCache.delete(oldest[0]);
  }
};

const readRadarCache = (key) => {
  const hit = radarCache.get(key);
  if (!hit) return null;

  if (hit.expiresAt <= Date.now()) {
    radarCache.delete(key);
    return null;
  }

  return hit.data;
};

const writeRadarCache = (key, data) => {
  radarCache.set(key, {
    data,
    createdAt: Date.now(),
    expiresAt: Date.now() + RADAR_CACHE_TTL_MS,
  });
  pruneRadarCache();
};

export const getOpportunityRadar = async (user, options = {}) => {
  const userId = String(user?._id || user?.id || "").trim();
  if (!userId) {
    return {
      summary: {
        generatedAt: new Date().toISOString(),
        segment: "new_seller",
        candidatePool: { jobs: 0, services: 0, products: 0 },
        topMix: { job: 0, service: 0, product: 0 },
        trendingTerms: [],
        personalization: { skills: 0, profileSignals: 0 },
      },
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        pages: 1,
        hasPrev: false,
        hasNext: false,
      },
      items: [],
    };
  }

  const segment = getRadarSegment(user);
  const weights =
    RADAR_SEGMENT_WEIGHTS[segment] || RADAR_SEGMENT_WEIGHTS.new_seller;

  const limit = clamp(options.limit ?? 12, 4, RADAR_MAX_LIMIT);
  const page = clamp(options.page ?? 1, 1, RADAR_MAX_PAGE);
  const minScore = clamp(options.minScore ?? RADAR_DEFAULT_MIN_SCORE, 0, 100);
  const allowedTypes = parseRadarTypes(options.types);

  const userSkills = Array.isArray(user?.skills)
    ? user.skills
        .map((skill) =>
          String(skill || "")
            .toLowerCase()
            .trim(),
        )
        .filter(Boolean)
    : [];

  const profileSignals = toTokenSet(
    userSkills.join(" "),
    user?.bio,
    user?.profileType,
    user?.address?.city,
    user?.address?.province,
  );

  const skillSignals = new Set(userSkills);
  const profileStamp = [
    user?.profileType || "",
    ...(userSkills.slice(0, 10) || []),
    user?.address?.city || "",
    user?.updatedAt ? new Date(user.updatedAt).getTime() : "",
  ].join("|");

  const cacheKey = `${userId}:${segment}:${limit}:${page}:${minScore}:${[...allowedTypes].sort().join(",")}:${profileStamp}`;
  const cached = readRadarCache(cacheKey);
  if (cached) return cached;

  const userObjectId = new mongoose.Types.ObjectId(userId);
  const feedbackSince = new Date(
    Date.now() - RADAR_FEEDBACK_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const [
    ongoingOrdersResult,
    jobsResult,
    servicesResult,
    productsResult,
    trendsResult,
    feedbackResult,
  ] = await Promise.allSettled([
    Order.countDocuments({ seller: userObjectId, status: "in_progress" }),
    Job.find({
      status: "open",
      employer: { $ne: userObjectId },
      ...publicModerationClause,
    })
      .sort({ featured: -1, createdAt: -1 })
      .limit(120)
      .select(
        "title slug category skills budget deadline featured views applicantsCount createdAt employer",
      )
      .lean(),
    Service.find({
      status: "active",
      seller: { $ne: userObjectId },
      ...publicModerationClause,
    })
      .sort({ featured: -1, "stats.orders": -1, createdAt: -1 })
      .limit(120)
      .select(
        "title slug category tags pricing stats featured createdAt seller",
      )
      .lean(),
    Product.find({
      status: "active",
      seller: { $ne: userObjectId },
      ...publicModerationClause,
    })
      .sort({ featured: -1, "stats.sales": -1, createdAt: -1 })
      .limit(120)
      .select(
        "title slug category price stats featured discount createdAt condition seller",
      )
      .lean(),
    SearchAnalytics.find()
      .sort("-count")
      .limit(30)
      .select("term count -_id")
      .lean(),
    OpportunityRadarEvent.aggregate([
      { $match: { createdAt: { $gte: feedbackSince } } },
      {
        $project: {
          itemType: "$itemType",
          category: { $ifNull: ["$category", "*"] },
          action: "$action",
        },
      },
      {
        $group: {
          _id: { itemType: "$itemType", category: "$category" },
          views: {
            $sum: { $cond: [{ $eq: ["$action", "view"] }, 1, 0] },
          },
          clicks: {
            $sum: { $cond: [{ $eq: ["$action", "click"] }, 1, 0] },
          },
          conversions: {
            $sum: { $cond: [{ $eq: ["$action", "conversion"] }, 1, 0] },
          },
        },
      },
    ]),
  ]);

  const jobs = jobsResult.status === "fulfilled" ? jobsResult.value : [];

  const services =
    servicesResult.status === "fulfilled" ? servicesResult.value : [];
  const products =
    productsResult.status === "fulfilled" ? productsResult.value : [];
  const trendingTerms =
    trendsResult.status === "fulfilled"
      ? trendsResult.value.map((term) => String(term.term || ""))
      : [];

  const feedbackMaps =
    feedbackResult.status === "fulfilled"
      ? buildFeedbackMaps(feedbackResult.value)
      : { byTypeCategory: new Map(), byType: new Map() };

  const trendingSignals = toTokenSet(trendingTerms.join(" "));
  const ongoingSellerOrders =
    ongoingOrdersResult.status === "fulfilled"
      ? Number(ongoingOrdersResult.value || 0)
      : 0;

  const scoreCandidate = (candidate) => {
    const itemSignals = toTokenSet(
      candidate.title,
      candidate.category,
      candidate.tags?.join(" "),
      candidate.skills?.join(" "),
    );

    const skillOverlap = intersectCount(itemSignals, skillSignals);
    const profileOverlap = intersectCount(itemSignals, profileSignals);
    const trendOverlap = intersectCount(itemSignals, trendingSignals);

    const relevanceScore = Math.min(42, skillOverlap * 11 + profileOverlap * 5);
    const trendScore = Math.min(20, trendOverlap * 4.5);
    const feedbackScore = getFeedbackScore(
      feedbackMaps,
      candidate.type,
      candidate.category,
    );

    const ageHours = toHoursSince(candidate.createdAt);
    const freshnessScore =
      ageHours <= 24 ? 16 : ageHours <= 72 ? 11 : ageHours <= 168 ? 7 : 3;

    let demandScore = 0;
    let urgencyScore = 0;
    const reasonTags = [];

    if (skillOverlap > 0) {
      reasonTags.push(`Matches ${skillOverlap} of your skills`);
    }
    if (trendOverlap > 0) {
      reasonTags.push("Riding current search demand");
    }
    if (feedbackScore >= 2.5) {
      reasonTags.push("High conversion momentum");
    }

    if (candidate.type === "job") {
      demandScore = Math.min(
        16,
        Number(candidate.views || 0) / 80 +
          Number(candidate.applicantsCount || 0) * 2.1,
      );

      const hoursToDeadline = toHoursUntil(candidate.deadline);
      if (Number.isFinite(hoursToDeadline) && hoursToDeadline > 0) {
        urgencyScore =
          hoursToDeadline <= 24
            ? 18
            : hoursToDeadline <= 72
              ? 12
              : hoursToDeadline <= 168
                ? 7
                : 0;
      }

      if (urgencyScore >= 12) reasonTags.push("Deadline approaching soon");
      if (Number(candidate.budget?.max || 0) > 0) {
        reasonTags.push(`Budget up to $${Number(candidate.budget.max)}`);
      }
    }

    if (candidate.type === "service") {
      demandScore = Math.min(
        16,
        Number(candidate.stats?.views || 0) / 120 +
          Number(candidate.stats?.orders || 0) * 2.4 +
          Number(candidate.stats?.averageRating || 0),
      );

      if (Number(candidate.stats?.averageRating || 0) >= 4.6) {
        reasonTags.push("Top-rated service quality");
      }
    }

    if (candidate.type === "product") {
      demandScore = Math.min(
        16,
        Number(candidate.stats?.views || 0) / 150 +
          Number(candidate.stats?.sales || 0) * 2.4 +
          Number(candidate.stats?.averageRating || 0),
      );

      const hoursToDiscountEnd = toHoursUntil(candidate.discount?.expiresAt);
      if (Number.isFinite(hoursToDiscountEnd) && hoursToDiscountEnd > 0) {
        urgencyScore =
          hoursToDiscountEnd <= 24 ? 12 : hoursToDiscountEnd <= 72 ? 9 : 0;
      }

      if (Number(candidate.discount?.value || 0) > 0) {
        reasonTags.push("Discount currently active");
      }
    }

    const featuredBoost = candidate.featured ? 5 : 0;
    if (candidate.featured) reasonTags.push("Featured placement");
    if (demandScore >= 10) reasonTags.push("Strong engagement momentum");

    const weightedRaw =
      relevanceScore * weights.relevance +
      trendScore * weights.trend +
      freshnessScore * weights.freshness +
      demandScore * weights.demand +
      urgencyScore * weights.urgency +
      feedbackScore * weights.feedback +
      featuredBoost * weights.featured;

    const weightedMax =
      42 * weights.relevance +
      20 * weights.trend +
      16 * weights.freshness +
      16 * weights.demand +
      18 * weights.urgency +
      8 * weights.feedback +
      5 * weights.featured;

    const matchScore = Math.min(100, (weightedRaw / weightedMax) * 100);

    return {
      ...candidate,
      matchScore: Math.round(matchScore),
      urgencyScore: Math.round(urgencyScore),
      demandScore: Math.round(demandScore),
      feedbackScore: Math.round(feedbackScore),
      reasonTags: reasonTags.slice(0, 4),
    };
  };

  const mappedJobs = jobs.map((job) => ({
    id: String(job._id),
    type: "job",
    title: job.title,
    slug: job.slug,
    category: job.category,
    skills: job.skills || [],
    budgetLabel:
      Number(job.budget?.min || 0) > 0 || Number(job.budget?.max || 0) > 0
        ? `$${Number(job.budget?.min || 0)} - $${Number(job.budget?.max || 0)}`
        : "Budget not specified",
    views: Number(job.views || 0),
    applicantsCount: Number(job.applicantsCount || 0),
    deadline: job.deadline,
    featured: !!job.featured,
    createdAt: job.createdAt,
  }));

  const mappedServices = services.map((service) => ({
    id: String(service._id),
    type: "service",
    title: service.title,
    slug: service.slug,
    category: service.category,
    tags: service.tags || [],
    priceLabel:
      serviceMinPrice(service) > 0
        ? `From $${serviceMinPrice(service)}`
        : "Custom pricing",
    stats: service.stats || {},
    featured: !!service.featured,
    createdAt: service.createdAt,
  }));

  const mappedProducts = products.map((product) => ({
    id: String(product._id),
    type: "product",
    title: product.title,
    slug: product.slug,
    category: product.category,
    priceLabel:
      Number(product.price || 0) > 0
        ? `$${Number(product.price).toFixed(2)}`
        : "Price unavailable",
    stats: product.stats || {},
    discount: product.discount || null,
    condition: product.condition || "",
    featured: !!product.featured,
    createdAt: product.createdAt,
  }));

  const scored = [...mappedJobs, ...mappedServices, ...mappedProducts]
    .map(scoreCandidate)
    .filter((item) => allowedTypes.has(item.type))
    .filter((item) => item.matchScore >= minScore)
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      if (b.urgencyScore !== a.urgencyScore)
        return b.urgencyScore - a.urgencyScore;
      return b.demandScore - a.demandScore;
    });

  const total = scored.length;
  const pages = Math.max(1, Math.ceil(total / limit));
  const normalizedPage = Math.min(page, pages);
  const start = (normalizedPage - 1) * limit;
  const pagedItems = scored.slice(start, start + limit);

  const topMix = pagedItems.reduce(
    (acc, item) => {
      acc[item.type] += 1;
      return acc;
    },
    { job: 0, service: 0, product: 0 },
  );

  const result = {
    summary: {
      generatedAt: new Date().toISOString(),
      segment,
      candidatePool: {
        jobs: mappedJobs.length,
        services: mappedServices.length,
        products: mappedProducts.length,
      },
      topMix,
      trendingTerms: trendingTerms.slice(0, 8),
      personalization: {
        skills: skillSignals.size,
        profileSignals: profileSignals.size,
      },
      context: {
        ongoingSellerOrders,
      },
      filters: {
        minScore,
        types: [...allowedTypes],
      },
    },
    pagination: {
      page: normalizedPage,
      limit,
      total,
      pages,
      hasPrev: normalizedPage > 1,
      hasNext: normalizedPage < pages,
    },
    items: pagedItems,
  };

  writeRadarCache(cacheKey, result);
  return result;
};

export const trackOpportunityRadarEvents = async (userId, payload) => {
  const rawEvents = Array.isArray(payload?.events) ? payload.events : [];
  if (!userId || rawEvents.length === 0) {
    return { accepted: 0, dropped: rawEvents.length || 0 };
  }

  const uid = new mongoose.Types.ObjectId(userId);
  const sessionId = String(payload?.sessionId || "")
    .trim()
    .slice(0, 120);

  const docs = rawEvents.slice(0, 30).reduce((acc, event) => {
    const action = String(event?.action || "")
      .toLowerCase()
      .trim();
    const itemType = String(event?.itemType || "")
      .toLowerCase()
      .trim();
    const itemId = String(event?.itemId || "")
      .trim()
      .slice(0, 120);

    if (!RADAR_EVENT_ACTIONS.has(action)) return acc;
    if (!RADAR_ITEM_TYPES.has(itemType)) return acc;
    if (!itemId) return acc;

    const category = String(event?.category || "")
      .toLowerCase()
      .trim()
      .slice(0, 80);
    const source = String(event?.source || "dashboard_radar")
      .trim()
      .slice(0, 40);
    const position = Number.isFinite(Number(event?.position))
      ? clamp(event.position, 0, 500)
      : undefined;
    const score = Number.isFinite(Number(event?.score))
      ? clamp(event.score, 0, 100)
      : undefined;
    const metadata =
      event?.metadata &&
      typeof event.metadata === "object" &&
      !Array.isArray(event.metadata)
        ? event.metadata
        : undefined;

    acc.push({
      user: uid,
      sessionId,
      source,
      action,
      itemType,
      itemId,
      category: category || undefined,
      position,
      score,
      metadata,
    });
    return acc;
  }, []);

  if (docs.length === 0) {
    return { accepted: 0, dropped: rawEvents.length };
  }

  await OpportunityRadarEvent.insertMany(docs, { ordered: false });

  if (docs.some((doc) => doc.action !== "view")) {
    radarCache.clear();
  }

  return {
    accepted: docs.length,
    dropped: Math.max(0, rawEvents.length - docs.length),
  };
};
