import { Spinner } from "@/components/common/LoadingScreen";
import api from "@/lib/api";
import { cn, formatCompact, formatCurrency, getInitials } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Crown,
  Medal,
  Package,
  Settings,
  Star,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useState } from "react";

type Tab = "sellers" | "services" | "products";

function resolveEntryRoute(
  tab: Tab,
  entry: any,
):
  | { to: "/profile/$username"; params: { username: string } }
  | { to: "/services/$slug"; params: { slug: string } }
  | { to: "/products/$slug"; params: { slug: string } }
  | null {
  if (tab === "sellers") {
    return entry.username
      ? { to: "/profile/$username", params: { username: entry.username } }
      : null;
  }

  if (tab === "services") {
    return entry.slug
      ? { to: "/services/$slug", params: { slug: entry.slug } }
      : null;
  }

  return entry.slug
    ? { to: "/products/$slug", params: { slug: entry.slug } }
    : null;
}

function useLeaderboard(type: Tab) {
  return useQuery({
    queryKey: ["leaderboard", type],
    queryFn: () =>
      api.get(`/search/leaderboard?type=${type}`).then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

const RANK_STYLES = [
  {
    icon: Crown,
    bg: "bg-amber-50 dark:bg-amber-950/30",
    ring: "ring-amber-400",
    text: "text-amber-500",
    size: "w-16 h-16",
  },
  {
    icon: Medal,
    bg: "bg-slate-50 dark:bg-slate-800/30",
    ring: "ring-slate-400",
    text: "text-slate-400",
    size: "w-14 h-14",
  },
  {
    icon: Medal,
    bg: "bg-orange-50 dark:bg-orange-950/30",
    ring: "ring-orange-400",
    text: "text-orange-500",
    size: "w-12 h-12",
  },
];

export default function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("sellers");
  const { data, isLoading } = useLeaderboard(tab);
  const entries: any[] = data ?? [];

  return (
    <div className="page-container py-10 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Trophy size={30} className="text-amber-500" />
        </div>
        <p className="section-label mb-2">Community</p>
        <h1 className="font-display font-bold text-3xl text-brand-navy dark:text-white mb-2">
          Top Performers
        </h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm">
          Zimbabwe's best sellers, services, and products on Hupfumi
        </p>
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit mx-auto mb-10">
        {(
          [
            ["sellers", "Top Sellers", TrendingUp],
            ["services", "Top Services", Settings],
            ["products", "Top Products", Package],
          ] as const
        ).map(([v, l, Icon]) => (
          <button
            key={v}
            type="button"
            onClick={() => setTab(v)}
            className={cn(
              "tab flex items-center gap-1.5",
              tab === v && "tab-active",
            )}
          >
            <Icon size={14} /> {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : entries.length === 0 ? (
        <div className="card p-14 text-center">
          <Trophy
            size={36}
            className="text-text-tertiary dark:text-slate-500 mx-auto mb-4"
          />
          <p className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            {tab === "sellers"
              ? "No seller rankings yet"
              : tab === "services"
                ? "No service rankings yet"
                : "No product rankings yet"}
          </p>
          <p className="text-text-tertiary dark:text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
            Rankings are generated from completed orders, reviews, fulfillment
            speed, and listing quality. Once real transactions happen, top
            performers will appear here automatically.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-5">
            {tab === "sellers" ? (
              <Link to="/settings/profile" className="btn-primary text-sm">
                Complete your profile
              </Link>
            ) : tab === "services" ? (
              <Link to="/services/new" className="btn-primary text-sm">
                Create a service
              </Link>
            ) : (
              <Link to="/products/new" className="btn-primary text-sm">
                List a product
              </Link>
            )}
            <Link to="/search" className="btn-secondary text-sm">
              Explore marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Top 3 podium */}
          {entries.slice(0, 3).length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-8">
              {entries.slice(0, 3).map((entry: any, i: number) => {
                const style = RANK_STYLES[i];
                const RankIcon = style.icon;
                const route = resolveEntryRoute(tab, entry);
                const className = cn(
                  "card p-5 text-center hover:border-brand-orange/30 transition-all group",
                  i === 0 && "order-2 lg:order-1",
                  i === 1 && "order-1 lg:order-2",
                  i === 2 && "order-3",
                );

                return route ? (
                  <Link
                    key={entry._id ?? i}
                    to={route.to}
                    params={route.params}
                    className={className}
                  >
                    <div className="relative mx-auto mb-3 w-fit">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt=""
                          className={cn(
                            "rounded-full object-cover ring-2 mx-auto",
                            style.size,
                            style.ring,
                          )}
                        />
                      ) : entry.images?.[0]?.url ? (
                        <img
                          src={entry.images[0].url}
                          alt=""
                          className={cn(
                            "rounded-xl object-cover ring-2 mx-auto",
                            style.size,
                            style.ring,
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "rounded-full bg-brand-navy text-white font-bold flex items-center justify-center ring-2 mx-auto",
                            style.size,
                            style.ring,
                          )}
                        >
                          <span className="text-lg">
                            {getInitials(entry.fullName ?? entry.title ?? "?")}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow",
                          style.bg,
                        )}
                      >
                        <RankIcon size={14} className={style.text} />
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-text-primary dark:text-white truncate group-hover:text-brand-orange transition-colors">
                      {entry.fullName ?? entry.title}
                    </p>
                    {tab === "sellers" && entry.averageRating > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-xs text-text-secondary dark:text-slate-400">
                          {entry.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {tab !== "sellers" && entry.price && (
                      <p className="text-sm font-bold text-brand-orange mt-1">
                        {formatCurrency(entry.price)}
                      </p>
                    )}
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                      {tab === "sellers"
                        ? `${entry.reviewCount ?? 0} reviews`
                        : `${formatCompact(entry.stats?.views ?? 0)} views`}
                    </p>
                  </Link>
                ) : (
                  <div key={entry._id ?? i} className={className}>
                    <div className="relative mx-auto mb-3 w-fit">
                      {entry.avatar ? (
                        <img
                          src={entry.avatar}
                          alt=""
                          className={cn(
                            "rounded-full object-cover ring-2 mx-auto",
                            style.size,
                            style.ring,
                          )}
                        />
                      ) : entry.images?.[0]?.url ? (
                        <img
                          src={entry.images[0].url}
                          alt=""
                          className={cn(
                            "rounded-xl object-cover ring-2 mx-auto",
                            style.size,
                            style.ring,
                          )}
                        />
                      ) : (
                        <div
                          className={cn(
                            "rounded-full bg-brand-navy text-white font-bold flex items-center justify-center ring-2 mx-auto",
                            style.size,
                            style.ring,
                          )}
                        >
                          <span className="text-lg">
                            {getInitials(entry.fullName ?? entry.title ?? "?")}
                          </span>
                        </div>
                      )}
                      <div
                        className={cn(
                          "absolute -top-2 -right-2 w-7 h-7 rounded-full flex items-center justify-center shadow",
                          style.bg,
                        )}
                      >
                        <RankIcon size={14} className={style.text} />
                      </div>
                    </div>
                    <p className="font-semibold text-sm text-text-primary dark:text-white truncate">
                      {entry.fullName ?? entry.title}
                    </p>
                    {tab === "sellers" && entry.averageRating > 0 && (
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-xs text-text-secondary dark:text-slate-400">
                          {entry.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                    {tab !== "sellers" && entry.price && (
                      <p className="text-sm font-bold text-brand-orange mt-1">
                        {formatCurrency(entry.price)}
                      </p>
                    )}
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                      {tab === "sellers"
                        ? `${entry.reviewCount ?? 0} reviews`
                        : `${formatCompact(entry.stats?.views ?? 0)} views`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Ranked list */}
          {entries.slice(3).map((entry: any, i: number) => {
            const route = resolveEntryRoute(tab, entry);

            return route ? (
              <Link
                key={entry._id ?? i}
                to={route.to}
                params={route.params}
                className="card p-4 flex items-center gap-4 hover:border-brand-orange/20 transition-all group"
              >
                <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                  <span className="font-bold text-sm text-text-tertiary dark:text-slate-500">
                    #{i + 4}
                  </span>
                </div>
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt=""
                    className="avatar w-10 h-10 shrink-0"
                  />
                ) : entry.images?.[0]?.url ? (
                  <img
                    src={entry.images[0].url}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {getInitials(entry.fullName ?? entry.title ?? "?")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary dark:text-white truncate group-hover:text-brand-orange transition-colors">
                    {entry.fullName ?? entry.title}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                    {tab === "sellers" ? `@${entry.username}` : entry.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {tab === "sellers" ? (
                    <>
                      <div className="flex items-center gap-1 justify-end">
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-sm font-bold text-text-primary dark:text-white">
                          {entry.averageRating?.toFixed(1) ?? "—"}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary dark:text-slate-500">
                        {entry.reviewCount ?? 0} reviews
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-sm text-brand-orange">
                        {formatCurrency(
                          entry.price ?? entry.pricing?.[0]?.price ?? 0,
                        )}
                      </p>
                      <p className="text-xs text-text-tertiary dark:text-slate-500">
                        {formatCompact(entry.stats?.views ?? 0)} views
                      </p>
                    </>
                  )}
                </div>
              </Link>
            ) : (
              <div
                key={entry._id ?? i}
                className="card p-4 flex items-center gap-4"
              >
                <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-dark-card flex items-center justify-center shrink-0">
                  <span className="font-bold text-sm text-text-tertiary dark:text-slate-500">
                    #{i + 4}
                  </span>
                </div>
                {entry.avatar ? (
                  <img
                    src={entry.avatar}
                    alt=""
                    className="avatar w-10 h-10 shrink-0"
                  />
                ) : entry.images?.[0]?.url ? (
                  <img
                    src={entry.images[0].url}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-brand-navy text-white text-sm font-bold flex items-center justify-center shrink-0">
                    {getInitials(entry.fullName ?? entry.title ?? "?")}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary dark:text-white truncate">
                    {entry.fullName ?? entry.title}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                    {tab === "sellers" ? `@${entry.username}` : entry.category}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  {tab === "sellers" ? (
                    <>
                      <div className="flex items-center gap-1 justify-end">
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-sm font-bold text-text-primary dark:text-white">
                          {entry.averageRating?.toFixed(1) ?? "—"}
                        </span>
                      </div>
                      <p className="text-xs text-text-tertiary dark:text-slate-500">
                        {entry.reviewCount ?? 0} reviews
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-bold text-sm text-brand-orange">
                        {formatCurrency(
                          entry.price ?? entry.pricing?.[0]?.price ?? 0,
                        )}
                      </p>
                      <p className="text-xs text-text-tertiary dark:text-slate-500">
                        {formatCompact(entry.stats?.views ?? 0)} views
                      </p>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
