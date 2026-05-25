import { useServices } from "@/hooks/useApi";
import { formatCurrency, storage } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Plus, Search, Settings, Star } from "lucide-react";
import { useEffect, useState } from "react";

const CATS = [
  "Technology",
  "Design",
  "Writing",
  "Marketing",
  "Engineering",
  "Education",
  "Finance",
  "Other",
];

const SERVICES_FILTER_STORAGE_KEY = "hupfumi-filters:services:v1";

const DEFAULT_SERVICE_PARAMS: Record<string, string> = {
  page: "1",
  limit: "20",
  q: "",
  category: "",
  maxPrice: "",
  sort: "-stats.averageRating",
};

export default function ServicesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const isMarketplaceUser = !["admin", "superadmin"].includes(user?.role ?? "");
  const [params, setParams] = useState<Record<string, string>>(() => {
    const saved = storage.get<Record<string, string>>(
      SERVICES_FILTER_STORAGE_KEY,
      {},
    );
    return { ...DEFAULT_SERVICE_PARAMS, ...saved };
  });
  const { data, isLoading } = useServices(params);
  const services = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  useEffect(() => {
    storage.set(SERVICES_FILTER_STORAGE_KEY, params);
  }, [params]);

  const setFilter = (k: string, v: string) =>
    setParams((p) => ({ ...p, [k]: v, page: "1" }));
  const setPage = (page: string) => setParams((p) => ({ ...p, page }));
  const clearFilters = () => setParams(DEFAULT_SERVICE_PARAMS);

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Browse Services</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {pagination?.total ?? 0} services available
          </p>
        </div>
        {isAuthenticated && isMarketplaceUser && (
          <Link to="/services/new" className="btn-primary">
            <Plus size={15} />
            Offer a Service
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-8 w-56 text-sm"
            placeholder="Search services…"
            value={params.q ?? ""}
            onChange={(e) => setFilter("q", e.target.value)}
          />
        </div>
        <select
          className="input w-44 text-sm"
          value={params.category ?? ""}
          onChange={(e) => setFilter("category", e.target.value)}
        >
          <option value="">All categories</option>
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          className="input w-36 text-sm"
          type="number"
          placeholder="Max price ($)"
          value={params.maxPrice ?? ""}
          onChange={(e) => setFilter("maxPrice", e.target.value)}
        />
        <select
          className="input w-44 text-sm"
          value={params.sort ?? "-stats.averageRating"}
          onChange={(e) => setFilter("sort", e.target.value)}
        >
          <option value="-stats.averageRating">Top Rated</option>
          <option value="-stats.orders">Most Popular</option>
          <option value="-createdAt">Newest First</option>
        </select>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton aspect-4/5 rounded-2xl" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="card p-14 text-center">
          <Settings
            size={36}
            className="text-text-tertiary dark:text-slate-500 mx-auto mb-4"
          />
          <p className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No services found
          </p>
          {isAuthenticated && isMarketplaceUser ? (
            <Link to="/services/new" className="btn-primary mt-3">
              Be the first to offer one
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {services.map((s: any) => (
              <Link
                key={s._id}
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="card overflow-hidden group card-interactive"
              >
                <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
                  {s.gallery?.[0]?.url ? (
                    <img
                      src={s.gallery[0].url}
                      alt={s.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Settings
                        size={32}
                        className="text-text-disabled dark:text-slate-600"
                      />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded-full bg-brand-navy flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                      {s.seller?.fullName?.[0] ?? "U"}
                    </div>
                    <span className="text-xs text-text-tertiary dark:text-slate-500 truncate">
                      {s.seller?.fullName}
                    </span>
                    {s.seller?.isVerifiedBadge && (
                      <CheckCircle
                        size={11}
                        className="text-brand-green shrink-0"
                      />
                    )}
                  </div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2 mb-3 group-hover:text-brand-orange transition-colors">
                    {s.title}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Star
                        size={11}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      <span className="text-xs text-text-tertiary">
                        {s.stats?.averageRating > 0
                          ? s.stats.averageRating.toFixed(1)
                          : "New"}
                      </span>
                      {s.stats?.reviewCount > 0 && (
                        <span className="text-xs text-text-tertiary">
                          ({s.stats.reviewCount})
                        </span>
                      )}
                    </div>
                    {s.pricing?.[0]?.price && (
                      <span className="text-sm font-bold text-brand-navy dark:text-white">
                        From {formatCurrency(s.pricing[0].price)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                className="btn-secondary text-sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(String(pagination.page - 1))}
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary dark:text-slate-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn-secondary text-sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage(String(pagination.page + 1))}
              >
                Next
              </button>
            </div>
          )}

          <section className="card p-6 mt-8">
            <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
              How Service Contracts Work
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
              Hupfumi services are built around clear scope, transparent
              pricing, and protected delivery.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                "1. Review service scope, package tiers, and delivery timelines.",
                "2. Align expectations through messages before placing your order.",
                "3. Confirm delivery quality before completion and release.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover p-4 text-sm text-text-secondary dark:text-slate-300"
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              <Link
                to="/security"
                className="text-brand-orange hover:underline"
              >
                Read trust and payment protection policy
              </Link>
              <Link to="/pricing" className="text-brand-orange hover:underline">
                Understand platform pricing and fees
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
