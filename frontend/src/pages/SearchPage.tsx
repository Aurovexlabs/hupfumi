import { Spinner } from "@/components/common/LoadingScreen";
import { useRecommendations, useSearch as useSearchHook } from "@/hooks/useApi";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  MapPin,
  Package,
  Search,
  Settings,
  Star,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";

const RECENT_KEY = "h_searches";
type Tab = "" | "jobs" | "services" | "products" | "users";
const TABS: { v: Tab; l: string; I: any }[] = [
  { v: "", l: "All", I: Search },
  { v: "jobs", l: "Jobs", I: Briefcase },
  { v: "services", l: "Services", I: Settings },
  { v: "products", l: "Products", I: Package },
  { v: "users", l: "People", I: Users },
];

export default function SearchPage() {
  const params = new URLSearchParams(window.location.search);
  const [q, setQ] = useState(params.get("q") ?? "");
  const [type, setType] = useState<Tab>((params.get("type") as Tab) ?? "");
  const { data, isLoading } = useSearchHook(q, type || undefined);
  const { data: recommendations, isLoading: recLoading } =
    useRecommendations(9);
  const d = data as any;

  const recommendationItems = (() => {
    const rec = recommendations as any;
    if (Array.isArray(rec?.items) && rec.items.length > 0) {
      return rec.items.slice(0, 6).map((item: any) => ({
        type: item.type,
        slug: item.slug,
        title: item.title,
        subtitle: item.category || item.priceLabel || item.budgetLabel,
        score: item.matchScore,
      }));
    }

    return [
      ...((rec?.jobs ?? []) as any[]).slice(0, 2).map((item) => ({
        type: "job",
        slug: item.slug,
        title: item.title,
        subtitle: item.category || item.jobType,
      })),
      ...((rec?.services ?? []) as any[]).slice(0, 2).map((item) => ({
        type: "service",
        slug: item.slug,
        title: item.title,
        subtitle: item.category,
      })),
      ...((rec?.products ?? []) as any[]).slice(0, 2).map((item) => ({
        type: "product",
        slug: item.slug,
        title: item.title,
        subtitle: item.category,
      })),
    ].filter((item) => item.slug && item.title);
  })();

  const total =
    (d?.jobs?.length ?? 0) +
    (d?.services?.length ?? 0) +
    (d?.products?.length ?? 0) +
    (d?.users?.length ?? 0);
  const isEmpty = q.length >= 2 && !isLoading && total === 0;

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Search input */}
      <div className="max-w-2xl mx-auto mb-8">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-12 pr-10 py-4 text-base"
            placeholder="Search jobs, services, products…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoFocus
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X size={16} />
            </button>
          )}
        </div>
        {q.length >= 2 && !isLoading && (
          <p className="text-sm text-text-tertiary dark:text-slate-500 mt-3">
            {total > 0
              ? `${total} results for "${q}"`
              : `No results for "${q}"`}
          </p>
        )}
      </div>

      {/* Tabs */}
      {q.length >= 2 && (
        <div className="tab-bar w-fit mb-8 flex-wrap">
          {TABS.map(({ v, l, I }) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={cn(
                "tab flex items-center gap-1.5",
                type === v && "tab-active",
              )}
            >
              <I size={14} />
              {l}
            </button>
          ))}
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner size={32} className="text-brand-orange" />
        </div>
      )}

      {isEmpty && (
        <div className="card p-16 text-center max-w-md mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-dark-card mx-auto mb-4 flex items-center justify-center">
            <Search
              size={26}
              className="text-text-tertiary dark:text-slate-500"
            />
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No results found
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            Try different keywords or browse our categories
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/jobs" className="btn-secondary text-sm">
              Browse Jobs
            </Link>
            <Link to="/services" className="btn-secondary text-sm">
              Browse Services
            </Link>
          </div>
        </div>
      )}

      {q.length < 2 && !isLoading && (
        <section className="py-8 space-y-8">
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-100 dark:bg-dark-card mx-auto mb-4 flex items-center justify-center">
              <Search
                size={26}
                className="text-text-tertiary dark:text-slate-500"
              />
            </div>
            <h2 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-2">
              Discover Zimbabwe's marketplace
            </h2>
            <p className="text-text-secondary dark:text-slate-400">
              Search across jobs, services, products, and people.
            </p>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold text-text-primary dark:text-white mb-2">
              How search works
            </h3>
            <p className="text-sm text-text-secondary dark:text-slate-400">
              Suggestions and recommendations adapt to trending demand, profile
              signals, and interaction history so you can find high-value
              opportunities faster.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-text-primary dark:text-white">
                Recommended for you
              </h3>
              {recLoading ? (
                <span className="text-xs text-text-tertiary dark:text-slate-500">
                  Loading recommendations…
                </span>
              ) : null}
            </div>

            {recommendationItems.length === 0 ? (
              <div className="card p-6 text-sm text-text-tertiary dark:text-slate-500 text-center">
                Recommendations will appear as you explore listings and update
                your profile.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommendationItems.map((item: any) => {
                  const icon =
                    item.type === "job"
                      ? Briefcase
                      : item.type === "service"
                        ? Settings
                        : Package;
                  const Icon = icon;

                  if (item.type === "job") {
                    return (
                      <Link
                        key={`${item.type}-${item.slug}`}
                        to="/jobs/$slug"
                        params={{ slug: item.slug }}
                        className="card p-4 hover:border-brand-orange/30 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} className="text-brand-orange" />
                          <span className="badge badge-blue">Job</span>
                          {typeof item.score === "number" ? (
                            <span className="text-[11px] text-text-tertiary ml-auto">
                              {item.score}% match
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2">
                          {item.title}
                        </p>
                        {item.subtitle ? (
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 line-clamp-1">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </Link>
                    );
                  }

                  if (item.type === "service") {
                    return (
                      <Link
                        key={`${item.type}-${item.slug}`}
                        to="/services/$slug"
                        params={{ slug: item.slug }}
                        className="card p-4 hover:border-brand-orange/30 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Icon size={14} className="text-brand-orange" />
                          <span className="badge badge-orange">Service</span>
                          {typeof item.score === "number" ? (
                            <span className="text-[11px] text-text-tertiary ml-auto">
                              {item.score}% match
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2">
                          {item.title}
                        </p>
                        {item.subtitle ? (
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 line-clamp-1">
                            {item.subtitle}
                          </p>
                        ) : null}
                      </Link>
                    );
                  }

                  return (
                    <Link
                      key={`${item.type}-${item.slug}`}
                      to="/products/$slug"
                      params={{ slug: item.slug }}
                      className="card p-4 hover:border-brand-orange/30 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Icon size={14} className="text-brand-orange" />
                        <span className="badge badge-green">Product</span>
                        {typeof item.score === "number" ? (
                          <span className="text-[11px] text-text-tertiary ml-auto">
                            {item.score}% match
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2">
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 line-clamp-1">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {d && !isLoading && (
        <div className="space-y-10">
          {(!type || type === "jobs") && d.jobs?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                  <Briefcase size={16} className="text-brand-orange" />
                  Jobs <span className="badge badge-gray">{d.jobs.length}</span>
                </h2>
                <Link
                  to="/jobs"
                  className="text-xs text-brand-orange hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-3">
                {d.jobs.map((j: any) => (
                  <Link
                    key={j._id}
                    to="/jobs/$slug"
                    params={{ slug: j.slug }}
                    className="card p-4 flex items-center justify-between gap-4 hover:border-brand-orange/30 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary dark:text-white group-hover:text-brand-orange transition-colors truncate">
                        {j.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-text-tertiary dark:text-slate-500">
                        <span className="badge badge-blue capitalize">
                          {j.jobType}
                        </span>
                        <span>{j.category}</span>
                        {j.location?.city && (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} />
                            {j.location.city}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="font-bold text-sm text-brand-navy dark:text-white shrink-0">
                      {formatCurrency(j.budget?.min)}+
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(!type || type === "services") && d.services?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                  <Settings size={16} className="text-brand-orange" />
                  Services{" "}
                  <span className="badge badge-gray">{d.services.length}</span>
                </h2>
                <Link
                  to="/services"
                  className="text-xs text-brand-orange hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {d.services.map((s: any) => (
                  <Link
                    key={s._id}
                    to="/services/$slug"
                    params={{ slug: s.slug }}
                    className="card overflow-hidden group hover:border-brand-orange/30 transition-all"
                  >
                    <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
                      {s.gallery?.[0]?.url ? (
                        <img
                          src={s.gallery[0].url}
                          alt={s.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Settings size={24} className="text-text-disabled" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2 group-hover:text-brand-orange transition-colors">
                        {s.title}
                      </p>
                      <p className="text-brand-orange font-bold text-sm mt-1">
                        From {formatCurrency(s.pricing?.[0]?.price ?? 0)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(!type || type === "products") && d.products?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                  <Package size={16} className="text-brand-orange" />
                  Products{" "}
                  <span className="badge badge-gray">{d.products.length}</span>
                </h2>
                <Link
                  to="/products"
                  className="text-xs text-brand-orange hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {d.products.map((p: any) => (
                  <Link
                    key={p._id}
                    to="/products/$slug"
                    params={{ slug: p.slug }}
                    className="card overflow-hidden group hover:border-brand-orange/30 transition-all"
                  >
                    <div className="aspect-square bg-surface-100 dark:bg-dark-card overflow-hidden">
                      {p.images?.[0]?.url ? (
                        <img
                          src={p.images[0].url}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={24} className="text-text-disabled" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-text-primary dark:text-white line-clamp-2">
                        {p.title}
                      </p>
                      <p className="font-bold text-brand-orange text-sm mt-1">
                        {formatCurrency(p.price)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {(!type || type === "users") && d.users?.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                  <Users size={16} className="text-brand-orange" />
                  People{" "}
                  <span className="badge badge-gray">{d.users.length}</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {d.users.map((u: any) => (
                  <Link
                    key={u._id}
                    to="/profile/$username"
                    params={{ username: u.username }}
                    className="card p-4 flex items-center gap-3 hover:border-brand-orange/30 transition-all group"
                  >
                    {u.avatar ? (
                      <img
                        src={u.avatar}
                        alt=""
                        className="avatar w-12 h-12 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-brand-navy text-white font-bold flex items-center justify-center shrink-0">
                        {getInitials(u.fullName)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary dark:text-white group-hover:text-brand-orange transition-colors truncate">
                        {u.fullName}
                      </p>
                      <p className="text-xs text-text-tertiary dark:text-slate-500">
                        @{u.username}
                      </p>
                      {u.skills?.length > 0 && (
                        <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5 truncate">
                          {u.skills.slice(0, 3).join(" · ")}
                        </p>
                      )}
                    </div>
                    {u.averageRating > 0 && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-xs text-text-secondary dark:text-slate-300 font-medium">
                          {u.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
