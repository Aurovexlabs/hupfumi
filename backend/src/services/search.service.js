import Job from "../models/Job.js";
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import SearchAnalytics from "../models/SearchAnalytics.js";
import Service from "../models/Service.js";
import User from "../models/User.js";
import { getOpportunityRadar } from "./analytics.service.js";
import { publicModerationClause } from "./moderation.service.js";

export const getTrending = async () => {
  const [trendingServices, trendingProducts, featuredJobs] = await Promise.all([
    Service.find({ status: "active", ...publicModerationClause })
      .sort("-stats.views -stats.orders")
      .limit(8)
      .select("title slug category pricing gallery stats")
      .populate("seller", "fullName username avatar isVerifiedBadge")
      .lean(),
    Product.find({ status: "active", ...publicModerationClause })
      .sort("-stats.views")
      .limit(8)
      .select("title slug category price images stats condition")
      .populate("seller", "fullName username avatar")
      .lean(),
    Job.find({ status: "open", featured: true, ...publicModerationClause })
      .sort("-createdAt")
      .limit(5)
      .populate("employer", "fullName username avatar isVerifiedBadge")
      .lean(),
  ]);

  return {
    trendingServices,
    trendingProducts,
    featuredJobs,
  };
};

export const getPopular = async () => {
  const popular = await SearchAnalytics.find()
    .sort("-count")
    .limit(10)
    .select("term count -_id")
    .lean();

  if (popular.length > 0) {
    return popular;
  }

  return [
    { term: "web developer", count: 120 },
    { term: "graphic design", count: 98 },
    { term: "content writing", count: 87 },
    { term: "solar panels", count: 74 },
    { term: "photography", count: 62 },
    { term: "catering", count: 55 },
  ];
};

export const getSuggestions = async (q) => {
  const normalized = String(q ?? "")
    .toLowerCase()
    .trim();
  if (normalized.length < 2) {
    return { suggestions: [] };
  }

  const [jobs, services, products] = await Promise.all([
    Job.find({
      $text: { $search: normalized },
      status: "open",
      ...publicModerationClause,
    })
      .limit(3)
      .select("title")
      .lean(),
    Service.find({
      $text: { $search: normalized },
      status: "active",
      ...publicModerationClause,
    })
      .limit(3)
      .select("title")
      .lean(),
    Product.find({
      $text: { $search: normalized },
      status: "active",
      ...publicModerationClause,
    })
      .limit(3)
      .select("title")
      .lean(),
  ]);

  const suggestions = [
    ...jobs.map((j) => ({ text: j.title, type: "jobs" })),
    ...services.map((s) => ({ text: s.title, type: "services" })),
    ...products.map((p) => ({ text: p.title, type: "products" })),
  ].slice(0, 8);

  return { suggestions };
};

export const search = async (q, type) => {
  const normalized = String(q ?? "").trim();
  if (normalized.length < 2) {
    return { jobs: [], services: [], products: [], users: [] };
  }

  SearchAnalytics.findOneAndUpdate(
    { term: normalized.toLowerCase() },
    { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
    { upsert: true },
  ).catch(() => {});

  const textFilter = { $text: { $search: normalized } };

  const [jobs, services, products, users] = await Promise.all([
    !type || type === "jobs"
      ? Job.find({ ...textFilter, status: "open", ...publicModerationClause })
          .limit(20)
          .populate("employer", "fullName username")
          .lean()
      : [],
    !type || type === "services"
      ? Service.find({
          ...textFilter,
          status: "active",
          ...publicModerationClause,
        })
          .limit(20)
          .populate("seller", "fullName username isVerifiedBadge")
          .lean()
      : [],
    !type || type === "products"
      ? Product.find({
          ...textFilter,
          status: "active",
          ...publicModerationClause,
        })
          .limit(20)
          .populate("seller", "fullName username")
          .lean()
      : [],
    !type || type === "users"
      ? User.find({ $text: { $search: normalized }, accountStatus: "active" })
          .limit(10)
          .select(
            "fullName username avatar skills averageRating reviewCount isVerifiedBadge",
          )
          .lean()
      : [],
  ]);

  return {
    jobs,
    services,
    products,
    users,
  };
};

export const getLeaderboard = async (type) => {
  if (type === "sellers") {
    return User.find({ accountStatus: "active", reviewCount: { $gt: 0 } })
      .sort("-averageRating -reviewCount")
      .limit(20)
      .select(
        "fullName username avatar averageRating reviewCount isVerifiedBadge profileType",
      )
      .lean();
  }

  if (type === "services") {
    return Service.find({ status: "active", ...publicModerationClause })
      .sort("-stats.orders -stats.averageRating")
      .limit(20)
      .select("title slug category pricing stats gallery seller")
      .populate("seller", "fullName username isVerifiedBadge")
      .lean();
  }

  if (type === "products") {
    return Product.find({ status: "active", ...publicModerationClause })
      .sort("-stats.sales -stats.views")
      .limit(20)
      .select("title slug category price images stats")
      .lean();
  }

  return [];
};

export const getFeatured = async () => {
  const [featuredJobs, featuredServices, featuredProducts] = await Promise.all([
    Job.find({ status: "open", featured: true, ...publicModerationClause })
      .limit(6)
      .populate("employer", "fullName username avatar isVerifiedBadge")
      .lean(),
    Service.find({
      status: "active",
      featured: true,
      ...publicModerationClause,
    })
      .limit(6)
      .populate("seller", "fullName username avatar isVerifiedBadge")
      .lean(),
    Product.find({
      status: "active",
      featured: true,
      ...publicModerationClause,
    })
      .limit(6)
      .lean(),
  ]);

  return {
    featuredJobs,
    featuredServices,
    featuredProducts,
  };
};

export const getPlatformStats = async () => {
  const [users, jobs, services, products, orders] = await Promise.all([
    User.countDocuments({ accountStatus: "active" }),
    Job.countDocuments({ status: "open", ...publicModerationClause }),
    Service.countDocuments({ status: "active", ...publicModerationClause }),
    Product.countDocuments({ status: "active", ...publicModerationClause }),
    Order.countDocuments({ status: "completed" }),
  ]);

  return {
    users,
    jobs,
    services,
    products,
    completedOrders: orders,
  };
};

export const getRecommendations = async (user, limit = 12) => {
  const safeLimit = Math.min(24, Math.max(3, Number(limit) || 12));

  if (user?._id) {
    const radar = await getOpportunityRadar(user, {
      limit: safeLimit,
      page: 1,
      minScore: 20,
    });

    const jobs = [];
    const services = [];
    const products = [];

    for (const item of radar.items || []) {
      if (item.type === "job") jobs.push(item);
      if (item.type === "service") services.push(item);
      if (item.type === "product") products.push(item);
    }

    return {
      personalized: true,
      summary: radar.summary,
      items: radar.items,
      jobs,
      services,
      products,
    };
  }

  const trending = await getTrending();

  const jobs = (trending.featuredJobs || []).slice(0, safeLimit);
  const services = (trending.trendingServices || []).slice(0, safeLimit);
  const products = (trending.trendingProducts || []).slice(0, safeLimit);

  return {
    personalized: false,
    summary: {
      generatedAt: new Date().toISOString(),
      strategy: "trending",
    },
    items: [],
    jobs,
    services,
    products,
  };
};
