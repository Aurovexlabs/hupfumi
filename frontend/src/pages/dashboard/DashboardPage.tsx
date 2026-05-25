import {
  useBuyerOrders,
  useKYCStatus,
  useMyWallet,
  useOpportunityRadar,
  useSellerOrders,
  useTrackOpportunityRadarEvents,
} from "@/hooks/useApi";
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  getInitials,
  getOrderStatusColor,
} from "@/lib/utils";
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  Bell,
  Briefcase,
  CheckCircle,
  Clock,
  Heart,
  MessageSquare,
  Package,
  Settings,
  Shield,
  ShoppingBag,
  Sparkles,
  Star,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";

const QUICK_ACTIONS = [
  {
    to: "/jobs/new",
    icon: Briefcase,
    label: "Post a Job",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    color: "text-blue-600",
  },
  {
    to: "/services/new",
    icon: Settings,
    label: "Create Service",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    color: "text-purple-600",
  },
  {
    to: "/products/new",
    icon: Package,
    label: "List Product",
    bg: "bg-green-50 dark:bg-green-950/40",
    color: "text-green-600",
  },
  {
    to: "/wallet",
    icon: Wallet,
    label: "Manage Wallet",
    bg: "bg-orange-50 dark:bg-orange-950/40",
    color: "text-brand-orange",
  },
] as const;

const QUICK_LINKS = [
  {
    to: "/analytics",
    icon: BarChart2,
    label: "Analytics",
    desc: "Earnings, views & performance",
    color: "text-purple-600",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    to: "/saved",
    icon: Heart,
    label: "Saved Items",
    desc: "Jobs, services & products saved",
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
  {
    to: "/messages",
    icon: MessageSquare,
    label: "Messages",
    desc: "Chat with buyers & sellers",
    color: "text-blue-600",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
] as const;

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [radarType, setRadarType] = useState<
    "all" | "job" | "service" | "product"
  >("all");
  const { data: wallet, isLoading: wl } = useMyWallet();
  const { data: buyerData, isLoading: bl } = useBuyerOrders({ limit: "5" });
  const { data: sellerData, isLoading: sl } = useSellerOrders({ limit: "5" });
  const { data: kyc } = useKYCStatus();
  const { data: radarData, isLoading: radarLoading } = useOpportunityRadar({
    limit: 8,
    page: 1,
    minScore: 28,
    ...(radarType !== "all" ? { types: radarType } : {}),
  });

  const recentBuyer = (buyerData as any)?.data ?? [];
  const recentSeller = (sellerData as any)?.data ?? [];
  const walletData = wallet as any;
  const kycData = (kyc as any) ?? {};
  const radar = (radarData as any) ?? { summary: {}, items: [] };

  const readiness = [
    {
      label: "Profile",
      ok: Boolean(user?.username && user?.fullName),
      detail: user?.username
        ? "Public identity ready"
        : "Add username and profile details",
      to: "/settings/profile" as const,
    },
    {
      label: "Verification",
      ok: Boolean(kycData?.isVerified),
      detail: kycData?.isVerified
        ? "KYC approved"
        : "Submit KYC to unlock full trust",
      to: "/settings/profile" as const,
    },
    {
      label: "Wallet",
      ok: (walletData?.balance ?? 0) > 0 || (walletData?.totalEarned ?? 0) > 0,
      detail:
        (walletData?.balance ?? 0) > 0
          ? "Funds available"
          : "Add or earn funds to activate wallet flows",
      to: "/wallet" as const,
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <p className="text-sm font-medium text-text-tertiary dark:text-slate-500 mb-1 flex items-center gap-1.5">
            <Sparkles size={13} className="text-brand-amber" /> {greeting}
          </p>
          <h1 className="font-display font-bold text-3xl text-brand-navy dark:text-white">
            {firstName}
          </h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            Track account health, active orders, and growth from one place.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Link
            to="/notifications"
            className="btn-icon"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </Link>
          {user?.username ? (
            <Link
              to="/profile/$username"
              params={{ username: user.username }}
              className="flex items-center gap-2.5 pl-3 pr-4 py-2 bg-surface-0 dark:bg-dark-card border border-surface-200 dark:border-dark-border rounded-xl hover:border-brand-orange/40 transition-all text-sm font-medium text-text-primary dark:text-white"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="avatar w-7 h-7" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(user?.fullName ?? "U")}
                </div>
              )}
              View Profile
            </Link>
          ) : (
            <div className="flex items-center gap-2.5 pl-3 pr-4 py-2 bg-surface-0 dark:bg-dark-card border border-surface-200 dark:border-dark-border rounded-xl text-sm font-medium text-text-primary dark:text-white">
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="avatar w-7 h-7" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(user?.fullName ?? "U")}
                </div>
              )}
              View Profile
            </div>
          )}
        </div>
      </div>

      <KYCBanner kyc={kyc as any} />

      <div className="card p-5 mb-8">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-widest">
            Account Readiness
          </p>
          <Link
            to="/settings/profile"
            className="text-xs text-brand-orange hover:underline"
          >
            Manage profile
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {readiness.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="rounded-xl border border-surface-200 dark:border-dark-border p-3 hover:border-brand-orange/30 transition-colors"
            >
              <p className="text-sm font-semibold text-text-primary dark:text-white flex items-center gap-1.5">
                {item.ok ? (
                  <CheckCircle size={14} className="text-brand-green" />
                ) : (
                  <AlertTriangle size={14} className="text-brand-amber" />
                )}
                {item.label}
              </p>
              <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                {item.detail}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {wl || bl || sl ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={Wallet}
              label="Wallet Balance"
              value={formatCurrency(walletData?.balance ?? 0)}
              color="text-brand-green"
              bg="bg-green-50 dark:bg-green-950/30"
              to="/wallet"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Earned"
              value={formatCurrency(walletData?.totalEarned ?? 0)}
              color="text-blue-600 dark:text-blue-400"
              bg="bg-blue-50 dark:bg-blue-950/30"
              to="/analytics"
            />
            {user?.username ? (
              <StatCard
                icon={Star}
                label="Rating"
                value={
                  user?.averageRating
                    ? `${user.averageRating.toFixed(1)} ★`
                    : "—"
                }
                color="text-brand-amber"
                bg="bg-amber-50 dark:bg-amber-950/30"
                to="/profile/$username"
                params={{ username: user.username }}
              />
            ) : (
              <div className="card p-5">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-amber-50 dark:bg-amber-950/30">
                  <Star
                    size={18}
                    className="text-brand-amber"
                    aria-hidden="true"
                  />
                </div>
                <p className="text-xs text-text-tertiary dark:text-slate-500 font-medium">
                  Rating
                </p>
                <p className="font-display font-bold text-xl text-text-primary dark:text-white mt-0.5 leading-tight">
                  {user?.averageRating
                    ? `${user.averageRating.toFixed(1)} ★`
                    : "—"}
                </p>
              </div>
            )}
            <StatCard
              icon={ShoppingBag}
              label="Active Orders"
              value={String(
                recentSeller.filter((o: any) => o.status === "in_progress")
                  .length,
              )}
              color="text-brand-orange"
              bg="bg-orange-50 dark:bg-orange-950/30"
              to="/orders"
            />
          </>
        )}
      </div>

      <div className="card p-6 mb-8">
        <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-widest mb-4">
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map(({ to, icon: Icon, label, bg, color }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center gap-2.5 p-4 rounded-2xl transition-all hover:scale-105 hover:shadow-md",
                bg,
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-black/25 flex items-center justify-center">
                <Icon size={20} className={color} aria-hidden="true" />
              </div>
              <span className="text-xs font-semibold text-text-primary dark:text-white text-center leading-tight">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <OpportunityRadarSection
        radar={radar}
        isLoading={radarLoading}
        activeType={radarType}
        onTypeChange={setRadarType}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <OrdersCard
          title="Recent Purchases"
          icon={ShoppingBag}
          orders={recentBuyer}
          isLoading={bl}
          emptyText="No purchases yet"
          emptyHint="Browse verified services and compare seller ratings before placing your first order."
          emptyLink="/services"
          emptyLabel="Browse Services"
        />
        <OrdersCard
          title="Recent Sales"
          icon={TrendingUp}
          orders={recentSeller}
          isLoading={sl}
          emptyText="No sales yet"
          emptyHint="Create a clear listing with pricing tiers and delivery times to attract buyers faster."
          emptyLink="/jobs/new"
          emptyLabel="Post a Job"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {QUICK_LINKS.map(({ to, icon: Icon, label, desc, color, bg }) => (
          <Link
            key={to}
            to={to}
            className="card p-4 flex items-center gap-4 hover:border-brand-orange/30 transition-all group"
          >
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0",
                bg,
              )}
            >
              <Icon size={20} className={color} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary dark:text-white text-sm group-hover:text-brand-orange transition-colors">
                {label}
              </p>
              <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5 truncate">
                {desc}
              </p>
            </div>
            <ArrowRight
              size={14}
              className="text-text-tertiary dark:text-slate-600 shrink-0 group-hover:text-brand-orange transition-colors"
            />
          </Link>
        ))}
      </div>
    </div>
  );
}

function KYCBanner({
  kyc,
}: {
  kyc?: { isVerified: boolean; status: string; rejectionReason?: string };
}) {
  if (!kyc || kyc.isVerified) return null;

  if (kyc.status === "pending") {
    return (
      <div className="mb-6 card p-4 border-l-4 border-brand-amber bg-amber-50/60 dark:bg-amber-950/20 flex items-center gap-3">
        <Clock size={18} className="text-brand-amber shrink-0" />
        <div>
          <p className="text-sm font-semibold text-text-primary dark:text-white">
            KYC Under Review
          </p>
          <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5">
            Your documents are being reviewed. This takes 24–48 hours.
          </p>
        </div>
      </div>
    );
  }

  if (kyc.status === "rejected") {
    return (
      <div className="mb-6 card p-4 border-l-4 border-red-400 bg-red-50/60 dark:bg-red-950/20 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={18} className="text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-text-primary dark:text-white">
              KYC Rejected
            </p>
            {kyc.rejectionReason && (
              <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5">
                Reason: {kyc.rejectionReason}
              </p>
            )}
          </div>
        </div>
        <Link to="/settings/profile" className="btn-danger text-xs shrink-0">
          Resubmit
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 card p-4 border-l-4 border-brand-orange bg-orange-50/60 dark:bg-orange-950/20 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <Shield size={18} className="text-brand-orange shrink-0" />
        <div>
          <p className="font-semibold text-text-primary dark:text-white text-sm">
            Complete KYC Verification
          </p>
          <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5">
            Get the verified badge and unlock higher withdrawal limits.
          </p>
        </div>
      </div>
      <Link
        to="/settings/profile"
        className="btn-primary text-sm shrink-0 py-2 px-4"
      >
        Verify now
      </Link>
    </div>
  );
}

function OpportunityRadarSection({
  radar,
  isLoading,
  activeType,
  onTypeChange,
}: {
  radar: any;
  isLoading: boolean;
  activeType: "all" | "job" | "service" | "product";
  onTypeChange: (type: "all" | "job" | "service" | "product") => void;
}) {
  const items = Array.isArray(radar?.items) ? radar.items : [];
  const summary = radar?.summary ?? {};
  const pagination = radar?.pagination ?? { total: items.length };
  const { mutate: trackRadarEvents } = useTrackOpportunityRadarEvents();
  const viewedFingerprintRef = useRef("");

  const sessionId = useMemo(() => {
    if (typeof window === "undefined") return "ssr";

    const key = "hupfumi_radar_session_id";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const generated = `radar_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 10)}`;
    window.sessionStorage.setItem(key, generated);
    return generated;
  }, []);

  useEffect(() => {
    if (isLoading || items.length === 0 || sessionId === "ssr") return;

    const fingerprint = `${summary?.generatedAt ?? ""}:${activeType}:${items
      .map((item: any) => `${item.type}-${item.id}-${item.matchScore}`)
      .join("|")}`;

    if (fingerprint === viewedFingerprintRef.current) return;
    viewedFingerprintRef.current = fingerprint;

    trackRadarEvents({
      sessionId,
      events: items.map((item: any, idx: number) => ({
        action: "view",
        itemType: item.type,
        itemId: String(item.id),
        category: item.category,
        position: idx,
        score: Number(item.matchScore || 0),
        source: "dashboard_radar",
      })),
    });
  }, [
    isLoading,
    items,
    summary?.generatedAt,
    activeType,
    sessionId,
    trackRadarEvents,
  ]);

  const trackClick = (item: any, position: number) => {
    if (sessionId === "ssr") return;

    trackRadarEvents({
      sessionId,
      events: [
        {
          action: "click",
          itemType: item.type,
          itemId: String(item.id),
          category: item.category,
          position,
          score: Number(item.matchScore || 0),
          source: "dashboard_radar",
          metadata: {
            segment: summary?.segment,
            filter: activeType,
          },
        },
      ],
    });
  };

  const filters: Array<{
    value: "all" | "job" | "service" | "product";
    label: string;
  }> = [
    { value: "all", label: "All" },
    { value: "job", label: "Jobs" },
    { value: "service", label: "Services" },
    { value: "product", label: "Products" },
  ];

  const segmentLabel = String(summary?.segment || "").replace(/_/g, " ");

  return (
    <div className="card p-6 mb-8">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-widest mb-1">
            Opportunity Radar
          </p>
          <h2 className="font-semibold text-text-primary dark:text-white">
            Personalized high-impact opportunities
          </h2>
          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
            Curated from live demand signals, your profile strengths, and
            urgency windows.
          </p>
          {!!segmentLabel && (
            <p className="text-[11px] text-text-tertiary dark:text-slate-500 mt-1 capitalize">
              Segment profile: {segmentLabel}
            </p>
          )}
        </div>
        <Link to="/search" className="btn-secondary text-xs shrink-0">
          Explore Market
        </Link>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="tab-bar">
          {filters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => onTypeChange(filter.value)}
              className={cn(
                "tab text-xs",
                activeType === filter.value && "tab-active",
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-text-tertiary dark:text-slate-500">
          Showing {items.length} of {pagination?.total ?? items.length}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-xl" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm font-semibold text-text-primary dark:text-white">
            Radar is warming up
          </p>
          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 max-w-sm mx-auto">
            Add skills and complete profile details so the platform can surface
            more precise, high-value opportunities.
          </p>
          <Link to="/settings/profile" className="btn-secondary text-xs mt-3">
            Improve Matching
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {items.map((item: any, index: number) => {
              const typeClass =
                item.type === "job"
                  ? "badge-blue"
                  : item.type === "service"
                    ? "badge-orange"
                    : "badge-green";

              const cardBody = (
                <>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={cn("badge capitalize", typeClass)}>
                      {item.type}
                    </span>
                    <span className="text-xs font-semibold text-brand-navy dark:text-white">
                      Match {item.matchScore}%
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-1">
                    {item.title}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 line-clamp-1 capitalize">
                    {item.category} · {item.budgetLabel || item.priceLabel}
                  </p>
                  <div className="mt-2 h-1.5 rounded-full bg-surface-100 dark:bg-dark-border overflow-hidden">
                    <div
                      className="h-full bg-brand-orange rounded-full"
                      style={{
                        width: `${Math.max(6, Number(item.matchScore || 0))}%`,
                      }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(item.reasonTags || []).slice(0, 2).map((tag: string) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-1 rounded-full bg-surface-100 dark:bg-dark-card text-text-tertiary dark:text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </>
              );

              if (item.type === "job") {
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to="/jobs/$slug"
                    params={{ slug: item.slug }}
                    onClick={() => trackClick(item, index)}
                    className="rounded-xl border border-surface-200 dark:border-dark-border p-3 hover:border-brand-orange/35 hover:bg-surface-50 dark:hover:bg-dark-hover transition-all block"
                  >
                    {cardBody}
                  </Link>
                );
              }

              if (item.type === "service") {
                return (
                  <Link
                    key={`${item.type}-${item.id}`}
                    to="/services/$slug"
                    params={{ slug: item.slug }}
                    onClick={() => trackClick(item, index)}
                    className="rounded-xl border border-surface-200 dark:border-dark-border p-3 hover:border-brand-orange/35 hover:bg-surface-50 dark:hover:bg-dark-hover transition-all block"
                  >
                    {cardBody}
                  </Link>
                );
              }

              return (
                <Link
                  key={`${item.type}-${item.id}`}
                  to="/products/$slug"
                  params={{ slug: item.slug }}
                  onClick={() => trackClick(item, index)}
                  className="rounded-xl border border-surface-200 dark:border-dark-border p-3 hover:border-brand-orange/35 hover:bg-surface-50 dark:hover:bg-dark-hover transition-all block"
                >
                  {cardBody}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-surface-100 dark:border-dark-border grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-text-tertiary dark:text-slate-500">Jobs</p>
              <p className="font-semibold text-text-primary dark:text-white">
                {summary?.topMix?.job ?? 0}
              </p>
            </div>
            <div>
              <p className="text-text-tertiary dark:text-slate-500">Services</p>
              <p className="font-semibold text-text-primary dark:text-white">
                {summary?.topMix?.service ?? 0}
              </p>
            </div>
            <div>
              <p className="text-text-tertiary dark:text-slate-500">Products</p>
              <p className="font-semibold text-text-primary dark:text-white">
                {summary?.topMix?.product ?? 0}
              </p>
            </div>
            <div>
              <p className="text-text-tertiary dark:text-slate-500">
                Profile signals
              </p>
              <p className="font-semibold text-text-primary dark:text-white">
                {summary?.personalization?.profileSignals ?? 0}
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type StatCardProps = {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
  bg: string;
} & (
  | { to: "/wallet" | "/analytics" | "/orders" }
  | { to: "/profile/$username"; params: { username: string } }
);

function StatCard(props: StatCardProps) {
  const { icon: Icon, label, value, color, bg } = props;

  if (props.to === "/profile/$username") {
    return (
      <Link
        to="/profile/$username"
        params={props.params}
        className="card p-5 hover:border-brand-orange/30 transition-all group"
      >
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
            bg,
          )}
        >
          <Icon size={18} className={color} aria-hidden="true" />
        </div>
        <p className="text-xs text-text-tertiary dark:text-slate-500 font-medium">
          {label}
        </p>
        <p className="font-display font-bold text-xl text-text-primary dark:text-white mt-0.5 leading-tight group-hover:text-brand-orange transition-colors">
          {value}
        </p>
      </Link>
    );
  }

  return (
    <Link
      to={props.to}
      className="card p-5 hover:border-brand-orange/30 transition-all group"
    >
      <div
        className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
          bg,
        )}
      >
        <Icon size={18} className={color} aria-hidden="true" />
      </div>
      <p className="text-xs text-text-tertiary dark:text-slate-500 font-medium">
        {label}
      </p>
      <p className="font-display font-bold text-xl text-text-primary dark:text-white mt-0.5 leading-tight group-hover:text-brand-orange transition-colors">
        {value}
      </p>
    </Link>
  );
}

function OrdersCard({
  title,
  icon: Icon,
  orders,
  isLoading,
  emptyText,
  emptyHint,
  emptyLink,
  emptyLabel,
}: {
  title: string;
  icon: React.ElementType;
  orders: any[];
  isLoading: boolean;
  emptyText: string;
  emptyHint: string;
  emptyLink: "/services" | "/jobs/new";
  emptyLabel: string;
}) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Icon size={16} className="text-brand-orange" aria-hidden="true" />
          <h2 className="font-semibold text-text-primary dark:text-white">
            {title}
          </h2>
        </div>
        <Link
          to="/orders"
          className="text-xs text-brand-orange hover:underline flex items-center gap-1"
        >
          All orders <ArrowRight size={11} />
        </Link>
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-14 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-text-tertiary dark:text-slate-500 mb-3">
            {emptyText}
          </p>
          <p className="text-xs text-text-tertiary dark:text-slate-500 max-w-xs mx-auto mb-3">
            {emptyHint}
          </p>
          <Link to={emptyLink} className="btn-secondary text-xs">
            {emptyLabel}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => (
            <Link
              key={order._id}
              to="/orders/$id"
              params={{ id: order._id }}
              className="flex items-center justify-between gap-3 p-3 rounded-xl hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary dark:text-white truncate group-hover:text-brand-orange transition-colors">
                  {order.orderNumber}
                </p>
                <p className="text-xs text-text-tertiary dark:text-slate-500">
                  {formatRelativeTime(order.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={cn("badge", getOrderStatusColor(order.status))}
                >
                  {order.status?.replace(/_/g, " ")}
                </span>
                <span className="text-sm font-bold text-brand-navy dark:text-white">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
