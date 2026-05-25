import { useJobs } from "@/hooks/useApi";
import { calculateSkillMatch } from "@/lib/matching";
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
} from "@/lib/recentlyViewed";
import { cn, formatCurrency, formatRelativeTime, storage } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  ChevronRight,
  Clock,
  Filter,
  MapPin,
  Plus,
  Search,
  Target,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";

const CATEGORIES = [
  "Technology",
  "Design",
  "Writing",
  "Marketing",
  "Engineering",
  "Finance",
  "Education",
  "Agriculture",
  "Construction",
  "Other",
];

const JOBS_FILTER_STORAGE_KEY = "hupfumi-filters:jobs:v1";

const DEFAULT_JOB_PARAMS: Record<string, string> = {
  page: "1",
  limit: "20",
  q: "",
  category: "",
  jobType: "",
  minBudget: "",
  maxBudget: "",
};

export default function JobsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const userSkills = user?.skills ?? [];
  const hasUserSkills = isAuthenticated && userSkills.length > 0;
  const isMarketplaceUser = !["admin", "superadmin"].includes(user?.role ?? "");
  const [params, setParams] = useState<Record<string, string>>(() => {
    const saved = storage.get<Record<string, string>>(
      JOBS_FILTER_STORAGE_KEY,
      {},
    );
    return { ...DEFAULT_JOB_PARAMS, ...saved };
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentlyViewedJobs, setRecentlyViewedJobs] = useState<
    RecentlyViewedItem[]
  >([]);
  const { data, isLoading } = useJobs(params);
  const jobs = data?.data ?? [];
  const pagination = data?.pagination;

  useEffect(() => {
    storage.set(JOBS_FILTER_STORAGE_KEY, params);
  }, [params]);

  useEffect(() => {
    setRecentlyViewedJobs(getRecentlyViewed("job", undefined, 4));
  }, []);

  const setFilter = (k: string, v: string) =>
    setParams((p) => ({ ...p, [k]: v, page: "1" }));
  const setPage = (page: string) => setParams((p) => ({ ...p, page }));
  const clearFilters = () => setParams(DEFAULT_JOB_PARAMS);

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Browse Jobs</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {pagination?.total ?? 0} opportunities available
          </p>
        </div>
        {isAuthenticated && isMarketplaceUser && (
          <Link to="/jobs/new" className="btn-primary">
            <Plus size={15} /> Post a Job
          </Link>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters */}
        <aside
          className={cn("lg:w-64 shrink-0", !showFilters && "hidden lg:block")}
        >
          <div className="card p-5 space-y-5 sticky top-20">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-text-primary dark:text-white text-sm">
                Filters
              </h3>
              <button
                type="button"
                className="btn-ghost text-xs py-1 px-2"
                onClick={clearFilters}
              >
                Reset
              </button>
            </div>
            <div>
              <label className="label">Keyword</label>
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
                />
                <input
                  className="input pl-8 text-sm"
                  placeholder="Search jobs…"
                  value={params.q ?? ""}
                  onChange={(e) => setFilter("q", e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Category</label>
              <select
                className="input text-sm"
                value={params.category ?? ""}
                onChange={(e) => setFilter("category", e.target.value)}
              >
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Job type</label>
              <div className="space-y-2">
                {[
                  ["", "All types"],
                  ["fixed", "Fixed price"],
                  ["hourly", "Hourly rate"],
                ].map(([v, l]) => (
                  <label
                    key={v}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="jobType"
                      value={v}
                      checked={(params.jobType ?? "") === v}
                      onChange={() => setFilter("jobType", v)}
                      className="accent-brand-orange"
                    />
                    <span className="text-sm text-text-secondary dark:text-slate-300">
                      {l}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Min budget ($)</label>
              <input
                type="number"
                className="input text-sm"
                placeholder="0"
                value={params.minBudget ?? ""}
                onChange={(e) => setFilter("minBudget", e.target.value)}
              />
            </div>
            <div>
              <label className="label">Max budget ($)</label>
              <input
                type="number"
                className="input text-sm"
                placeholder="Any"
                value={params.maxBudget ?? ""}
                onChange={(e) => setFilter("maxBudget", e.target.value)}
              />
            </div>
          </div>
        </aside>

        {/* List */}
        <div className="flex-1 min-w-0">
          <button
            className="lg:hidden btn-secondary mb-4 text-sm w-full"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={14} /> {showFilters ? "Hide filters" : "Show filters"}
          </button>

          {recentlyViewedJobs.length > 0 && (
            <section className="card p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-text-primary dark:text-white">
                  Continue Browsing
                </h2>
                <span className="text-xs text-text-tertiary dark:text-slate-500">
                  Recently viewed jobs
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {recentlyViewedJobs.map((item) => (
                  <Link
                    key={item.id}
                    to="/jobs/$slug"
                    params={{ slug: item.slug }}
                    className="rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover p-3 hover:border-brand-orange/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-text-primary dark:text-white line-clamp-1">
                      {item.title}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500 line-clamp-1 mt-1">
                      {item.subtitle || "Job opportunity"}
                    </p>
                    {item.price ? (
                      <p className="text-xs text-brand-orange font-semibold mt-1.5">
                        From {formatCurrency(item.price)}
                      </p>
                    ) : null}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton h-32 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="card p-14 text-center">
              <div className="w-16 h-16 bg-surface-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Briefcase
                  size={28}
                  className="text-text-tertiary dark:text-slate-500"
                />
              </div>
              <p className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
                No jobs found
              </p>
              <p className="text-text-secondary dark:text-slate-400 text-sm">
                Try adjusting your filters
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job: any) =>
                (() => {
                  const match = hasUserSkills
                    ? calculateSkillMatch(job.skills, userSkills)
                    : null;
                  const matchedSkills = new Set(
                    (match?.matched ?? []).map((skill) => skill.toLowerCase()),
                  );

                  return (
                    <Link
                      key={job._id}
                      to="/jobs/$slug"
                      params={{ slug: job.slug }}
                      className="card p-5 block hover:border-brand-orange/30 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span
                              className={cn(
                                "badge",
                                job.jobType === "fixed"
                                  ? "badge-blue"
                                  : "badge-orange",
                              )}
                            >
                              {job.jobType}
                            </span>
                            {job.featured && (
                              <span className="badge badge-amber">
                                Featured
                              </span>
                            )}
                            <span className="badge badge-gray">
                              {job.category}
                            </span>
                            {match && (
                              <span
                                className={cn(
                                  "badge flex items-center gap-1",
                                  match.score >= 70
                                    ? "badge-green"
                                    : match.score >= 40
                                      ? "badge-amber"
                                      : "badge-gray",
                                )}
                              >
                                <Target size={11} /> Match {match.score}%
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold text-text-primary dark:text-white text-base mb-2 group-hover:text-brand-orange transition-colors line-clamp-2">
                            {job.title}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-xs text-text-tertiary dark:text-slate-500">
                            {job.location?.city && (
                              <span className="flex items-center gap-1">
                                <MapPin size={11} />
                                {job.location.city}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock size={11} />
                              {formatRelativeTime(job.createdAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users size={11} />
                              {job.applicantsCount} applicants
                            </span>
                          </div>
                          {job.skills?.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {job.skills.slice(0, 5).map((s: string) => (
                                <span
                                  key={s}
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded-full",
                                    matchedSkills.has(String(s).toLowerCase())
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                      : "bg-surface-100 dark:bg-dark-card text-text-secondary dark:text-slate-400",
                                  )}
                                >
                                  {s}
                                </span>
                              ))}
                              {job.skills.length > 5 && (
                                <span className="text-xs text-text-tertiary">
                                  +{job.skills.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-display font-bold text-brand-navy dark:text-white">
                            {formatCurrency(job.budget?.min)} –{" "}
                            {formatCurrency(job.budget?.max)}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500">
                            {job.jobType === "hourly" ? "/hr" : "fixed"}
                          </p>
                          <ChevronRight
                            size={16}
                            className="text-text-tertiary ml-auto mt-3 group-hover:text-brand-orange transition-colors"
                          />
                        </div>
                      </div>
                    </Link>
                  );
                })(),
              )}
            </div>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
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
              How Job Hiring Works On Hupfumi
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
              Every project follows a structured trust workflow built for speed,
              clarity, and safer delivery outcomes.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                "1. Post a clear brief with budget, timeline, and success criteria.",
                "2. Compare proposals, ratings, and response quality before selecting talent.",
                "3. Track milestones and release payment after successful delivery.",
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
                Escrow and security safeguards
              </Link>
              <Link to="/about" className="text-brand-orange hover:underline">
                Platform trust and quality standards
              </Link>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
