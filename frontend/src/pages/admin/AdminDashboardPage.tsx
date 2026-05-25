import LoadingScreen from "@/components/common/LoadingScreen";
import {
  useAdminAuditLogs,
  useAdminDisputes,
  useAdminStats,
  useAdminSystemHealth,
  useAdminUsers,
} from "@/hooks/useApi";
import { cn, formatCompact, formatRelativeTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  BarChart2,
  ChevronRight,
  Database,
  Shield,
  UserX,
  Users,
  Zap,
} from "lucide-react";

const asArray = <T,>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : [];

export default function AdminDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useAdminStats();
  const { data: health, isLoading: healthLoading } = useAdminSystemHealth();
  const { data: usersData } = useAdminUsers({
    accountStatus: "suspended",
    limit: "6",
  });
  const { data: disputesData } = useAdminDisputes({
    status: "open",
    limit: "6",
  });
  const { data: auditData } = useAdminAuditLogs({ limit: "6" });

  if (statsLoading) return <LoadingScreen />;

  const dashboard = (stats as any) || {};
  const systemHealth = (health as any) || {};

  const restrictedUsers = asArray<any>(
    (usersData as any)?.data?.data ?? (usersData as any)?.data,
  );
  const disputes = asArray<any>(
    (disputesData as any)?.data?.data ?? (disputesData as any)?.data,
  );
  const audits = asArray<any>(
    (auditData as any)?.data?.data ?? (auditData as any)?.data,
  );

  const statusText = String(systemHealth?.status || "unknown");
  const isOperational = statusText === "operational";

  const kpis = [
    {
      label: "Total Users",
      value: formatCompact(dashboard?.users?.total ?? 0),
      sub: `+${dashboard?.users?.thisMonth ?? 0} this month`,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-50 dark:bg-blue-950/30",
    },
    {
      label: "Restricted Accounts",
      value: formatCompact(dashboard?.restrictedAccounts ?? 0),
      sub: "Suspended or banned",
      icon: UserX,
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/30",
    },
    {
      label: "Open Disputes",
      value: formatCompact(dashboard?.disputes ?? 0),
      sub: "Needs moderation",
      icon: AlertTriangle,
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-950/30",
    },
    {
      label: "Pending KYC",
      value: formatCompact(dashboard?.pendingKyc ?? 0),
      sub: "Awaiting identity review",
      icon: Shield,
      color: "text-violet-600 dark:text-violet-400",
      bg: "bg-violet-50 dark:bg-violet-950/30",
    },
    {
      label: "Content Queue",
      value: formatCompact(dashboard?.moderationQueue ?? 0),
      sub: "Flagged listings",
      icon: AlertTriangle,
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-950/30",
    },
    {
      label: "Platform Orders",
      value: formatCompact(dashboard?.orders?.total ?? 0),
      sub: `+${dashboard?.orders?.thisMonth ?? 0} this month`,
      icon: BarChart2,
      color: "text-brand-green",
      bg: "bg-green-50 dark:bg-green-950/30",
    },
  ] as const;

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center">
            <Shield size={20} className="text-brand-orange" />
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
              Admin Console
            </h1>
            <p className="text-text-secondary dark:text-slate-400 text-sm">
              Governance, safety, and operational visibility for the platform.
            </p>
          </div>
        </div>
        <div
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl border",
            isOperational
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
          )}
        >
          <div
            className={cn(
              "w-2 h-2 rounded-full",
              isOperational ? "bg-brand-green" : "bg-brand-amber",
            )}
          />
          <span
            className={cn(
              "text-xs font-semibold capitalize",
              isOperational ? "text-brand-green" : "text-brand-amber",
            )}
          >
            {statusText}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
        {kpis.map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="card p-4">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center mb-3",
                bg,
              )}
            >
              <Icon size={16} className={color} />
            </div>
            <p className="text-xs text-text-tertiary dark:text-slate-500 font-medium mb-0.5">
              {label}
            </p>
            <p className="font-display font-bold text-lg text-text-primary dark:text-white leading-tight">
              {value}
            </p>
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
              {sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
              <AlertTriangle size={16} className="text-brand-amber" />
              Risk And Moderation Queue
            </h2>
            <div className="flex items-center gap-3 text-xs">
              <Link
                to="/admin/kyc"
                className="text-brand-orange hover:underline"
              >
                KYC queue
              </Link>
              <Link
                to="/admin/moderation"
                className="text-brand-orange hover:underline"
              >
                Content queue
              </Link>
            </div>
          </div>

          <div className="space-y-3">
            {disputes.length === 0 && restrictedUsers.length === 0 ? (
              <p className="text-sm text-text-tertiary dark:text-slate-500">
                No active moderation issues right now.
              </p>
            ) : (
              <>
                {disputes.map((dispute) => (
                  <Link
                    key={dispute._id}
                    to="/admin/disputes"
                    className="block p-3 rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover hover:border-brand-orange/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Dispute #
                      {String(dispute.order?._id || dispute._id).slice(-6)}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 line-clamp-2">
                      {dispute.reason || "Open dispute requires review"}
                    </p>
                  </Link>
                ))}
                {restrictedUsers.slice(0, 3).map((user) => (
                  <Link
                    key={user._id}
                    to="/admin/users"
                    className="block p-3 rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover hover:border-brand-orange/30 transition-colors"
                  >
                    <p className="text-sm font-medium text-text-primary dark:text-white">
                      Restricted account: {user.fullName}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                      @{user.username} · {user.accountStatus}
                    </p>
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="card p-6">
          <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2 mb-4">
            <Activity size={16} className="text-brand-green" />
            System Health
          </h2>

          {healthLoading ? (
            <p className="text-sm text-text-tertiary dark:text-slate-500">
              Loading health metrics…
            </p>
          ) : (
            <div className="space-y-3 text-sm">
              <HealthRow
                label="Database"
                value={systemHealth?.database?.state || "unknown"}
                icon={Database}
              />
              <HealthRow
                label="Uptime"
                value={`${systemHealth?.uptimeSeconds ?? 0}s`}
                icon={Zap}
              />
              <HealthRow
                label="Node"
                value={systemHealth?.runtime?.nodeVersion || "unknown"}
                icon={Activity}
              />
              <div className="pt-3 mt-3 border-t border-surface-100 dark:border-dark-border text-xs text-text-tertiary dark:text-slate-500 space-y-1.5">
                <p>Heap used: {systemHealth?.memory?.heapUsedMb ?? "--"} MB</p>
                <p>
                  Heap total: {systemHealth?.memory?.heapTotalMb ?? "--"} MB
                </p>
                <p>Active users: {systemHealth?.users?.active ?? "--"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-text-primary dark:text-white">
            Recent Governance Activity
          </h2>
          <Link
            to="/admin/users"
            className="text-xs text-brand-orange hover:underline flex items-center gap-1"
          >
            Manage users <ChevronRight size={12} />
          </Link>
        </div>
        {audits.length === 0 ? (
          <p className="text-sm text-text-tertiary dark:text-slate-500">
            No audit entries found.
          </p>
        ) : (
          <div className="space-y-2">
            {audits.map((entry) => (
              <div
                key={entry._id}
                className="p-3 rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-text-primary dark:text-white">
                    {String(entry.action || "").replace(/_/g, " ")}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500">
                    {formatRelativeTime(entry.createdAt)}
                  </p>
                </div>
                <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                  By {entry.actor?.fullName || entry.actor?.username || "Admin"}
                  {entry.reason ? ` · ${entry.reason}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-6">
        <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-widest mb-4">
          How The Admin Console Works
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            "1. Monitor system health and usage trends in real time.",
            "2. Moderate disputes and restrict abusive accounts quickly.",
            "3. Audit every critical action for accountability and incident response.",
          ].map((step) => (
            <div
              key={step}
              className="rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover p-4 text-sm text-text-secondary dark:text-slate-300"
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function HealthRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Activity;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-dark-card flex items-center justify-center shrink-0">
        <Icon size={13} className="text-text-secondary dark:text-slate-400" />
      </div>
      <p className="text-sm font-medium text-text-primary dark:text-white flex-1">
        {label}
      </p>
      <p className="text-xs text-text-tertiary dark:text-slate-500 capitalize">
        {value}
      </p>
    </div>
  );
}
