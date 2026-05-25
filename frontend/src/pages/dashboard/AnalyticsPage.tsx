import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import {
  useAnalyticsOverview,
  useListingStats,
  useRevenueChart,
} from "@/hooks/useApi";
import { cn, formatCompact, formatCurrency } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  BarChart2,
  CheckCircle,
  DollarSign,
  ExternalLink,
  Eye,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const PERIODS = [
  { l: "7d", v: "7" },
  { l: "30d", v: "30" },
  { l: "90d", v: "90" },
  { l: "1y", v: "365" },
] as const;

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30");
  const { data: overview, isLoading: ol } = useAnalyticsOverview();
  const { data: revenue, isFetching: rl } = useRevenueChart(period);
  const { data: listings, isLoading: ll } = useListingStats();

  if (ol) return <LoadingScreen />;
  const ov = overview as any;
  const rv = revenue as any;
  const ls = listings as any;

  const kpis = [
    {
      label: "Total Revenue",
      value: formatCurrency(ov?.revenue?.total ?? 0),
      sub: `${formatCurrency(ov?.revenue?.thisMonth ?? 0)} this month`,
      icon: DollarSign,
      color: "text-brand-green",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
    {
      label: "Total Orders",
      value: formatCompact(ov?.orders?.total ?? 0),
      sub: `${ov?.orders?.thisMonth ?? 0} this month`,
      icon: ShoppingBag,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Total Views",
      value: formatCompact(ov?.totalViews ?? 0),
      sub: "Across all listings",
      icon: Eye,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-950/30",
    },
    {
      label: "Avg. Rating",
      value: ov?.rating?.avg > 0 ? `${ov.rating.avg} ★` : "—",
      sub: `${ov?.rating?.count ?? 0} reviews`,
      icon: Star,
      color: "text-brand-amber",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Completion Rate",
      value: `${ov?.completionRate ?? 100}%`,
      sub: "Completed vs cancelled",
      icon: CheckCircle,
      color: "text-brand-green",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
  ];

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Analytics</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            Your seller performance at a glance
          </p>
        </div>
        <Link to="/dashboard" className="btn-secondary text-sm">
          ← Dashboard
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card p-5">
            <div
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                bg,
              )}
            >
              <Icon size={18} className={color} />
            </div>
            <p className="text-xs text-text-tertiary dark:text-slate-500 font-medium">
              {label}
            </p>
            <p className="font-display font-bold text-xl text-text-primary dark:text-white mt-0.5 leading-tight">
              {value}
            </p>
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
              {sub}
            </p>
          </div>
        ))}
      </div>

      {/* Revenue Chart */}
      <div className="card p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-brand-orange" />
            <h2 className="font-semibold text-text-primary dark:text-white">
              Revenue
            </h2>
            {rl && <Spinner size={14} className="text-text-tertiary" />}
          </div>
          <div className="tab-bar">
            {PERIODS.map(({ l, v }) => (
              <button
                key={v}
                type="button"
                onClick={() => setPeriod(v)}
                className={cn("tab text-xs", period === v && "tab-active")}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        {rv?.chart ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart
              data={rv.chart}
              margin={{ top: 5, right: 5, bottom: 5, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.12)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(d) => d.slice(5)}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickFormatter={(v) => `$${formatCompact(v)}`}
              />
              <Tooltip
                contentStyle={{
                  background: "#111f35",
                  border: "1px solid #1e3052",
                  borderRadius: 12,
                  fontSize: 13,
                }}
                labelStyle={{ color: "#9ca3af" }}
                formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#F97316"
                strokeWidth={2.5}
                fill="#F97316"
                fillOpacity={0.12}
                dot={false}
                activeDot={{ r: 5, fill: "#F97316" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-60 flex flex-col items-center justify-center text-center px-4">
            <p className="text-text-secondary dark:text-slate-400 text-sm font-medium">
              No revenue data for this period
            </p>
            <p className="text-text-tertiary dark:text-slate-500 text-xs mt-1 max-w-sm">
              Revenue appears after completed orders are paid out. Try a wider
              date range or complete active orders to populate this chart.
            </p>
          </div>
        )}
        {rv?.totals && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-surface-100 dark:border-dark-border">
            <div>
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                Period Revenue
              </p>
              <p className="font-bold text-text-primary dark:text-white">
                {formatCurrency(rv.totals.revenue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                Period Orders
              </p>
              <p className="font-bold text-text-primary dark:text-white">
                {rv.totals.orders}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Listing Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(
          [
            {
              title: "Top Services",
              data: ls?.services,
              to: "/my/services",
              empty: "No services yet",
              emptyDesc:
                "Publish your first service to start collecting views, orders, and ranking insights.",
              emptyCtaTo: "/services/new",
              emptyCtaLabel: "Create Service",
              renderItem: (s: any) => (
                <Link
                  key={s._id}
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-white truncate group-hover:text-brand-orange transition-colors">
                      {s.title}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                      {s.stats?.views ?? 0} views · {s.stats?.orders ?? 0}{" "}
                      orders
                    </p>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-text-tertiary group-hover:text-brand-orange transition-colors shrink-0"
                  />
                </Link>
              ),
            },
            {
              title: "Top Products",
              data: ls?.products,
              to: "/my/products",
              empty: "No products yet",
              emptyDesc:
                "List your first product to start tracking sales performance and listing visibility.",
              emptyCtaTo: "/products/new",
              emptyCtaLabel: "List Product",
              renderItem: (p: any) => (
                <Link
                  key={p._id}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors group"
                >
                  {p.images?.[0]?.url ? (
                    <img
                      src={p.images[0].url}
                      alt={p.title}
                      className="w-10 h-10 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-dark-card shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary dark:text-white truncate group-hover:text-brand-orange transition-colors">
                      {p.title}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500">
                      {formatCurrency(p.price)} · {p.stats?.sales ?? 0} sold
                    </p>
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-text-tertiary group-hover:text-brand-orange transition-colors shrink-0"
                  />
                </Link>
              ),
            },
          ] as const
        ).map(
          ({
            title,
            data,
            to,
            empty,
            emptyDesc,
            emptyCtaTo,
            emptyCtaLabel,
            renderItem,
          }) => (
            <div key={title} className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-text-primary dark:text-white">
                  {title}
                </h2>
                <Link
                  to={to}
                  className="text-xs text-brand-orange hover:underline flex items-center gap-1"
                >
                  All <ExternalLink size={11} />
                </Link>
              </div>
              {ll ? (
                <Spinner size={20} className="text-brand-orange mx-auto" />
              ) : !data?.length ? (
                <div className="text-center py-4">
                  <p className="text-sm text-text-secondary dark:text-slate-400 font-medium">
                    {empty}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 max-w-xs mx-auto">
                    {emptyDesc}
                  </p>
                  <Link
                    to={emptyCtaTo}
                    className="btn-secondary text-xs mt-3 inline-flex"
                  >
                    {emptyCtaLabel}
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">{data.map(renderItem)}</div>
              )}
            </div>
          ),
        )}
      </div>
    </div>
  );
}
