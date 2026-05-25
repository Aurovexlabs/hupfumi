import { Spinner } from "@/components/common/LoadingScreen";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/useApi";
import { cn, formatRelativeTime } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  DollarSign,
  Filter,
  Megaphone,
  MessageSquare,
  Shield,
  ShoppingBag,
  Star,
} from "lucide-react";
import { useState } from "react";

type Filter =
  | "all"
  | "unread"
  | "order"
  | "payment"
  | "message"
  | "security"
  | "review"
  | "kyc";

const ICON_MAP: Record<string, React.ElementType> = {
  order_new: ShoppingBag,
  order_update: ShoppingBag,
  payment: DollarSign,
  message: MessageSquare,
  review: Star,
  kyc: Shield,
  promotion: Megaphone,
  system: Bell,
  security: Shield,
};

const FILTERS: { v: Filter; l: string }[] = [
  { v: "all", l: "All" },
  { v: "unread", l: "Unread" },
  { v: "order", l: "Orders" },
  { v: "payment", l: "Payments" },
  { v: "message", l: "Messages" },
  { v: "security", l: "Security" },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useNotifications({ limit: "50" });
  const markRead = useMarkNotificationsRead();

  const all: any[] = (data as any)?.data ?? [];
  const unreadCount = all.filter((n) => !n.isRead).length;

  const filtered = all.filter((n) => {
    if (filter === "unread") return !n.isRead;
    if (filter === "order") return n.type?.startsWith("order");
    if (filter === "payment") return n.type === "payment";
    if (filter === "message") return n.type === "message";
    if (filter === "security") return n.type === "security";
    return true;
  });

  return (
    <div className="page-container py-10 animate-fade-in max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="section-title">Notifications</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {all.length} total ·{" "}
            <span className="text-brand-orange font-medium">
              {unreadCount} unread
            </span>
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markRead.mutate("all")}
            disabled={markRead.isPending}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            {markRead.isPending ? (
              <Spinner size={13} className="text-text-tertiary" />
            ) : (
              <CheckCheck size={14} />
            )}
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="tab-bar mb-6 overflow-x-auto scrollbar-hide w-fit max-w-full">
        {FILTERS.map(({ v, l }) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={cn(
              "tab flex items-center gap-1.5 shrink-0",
              filter === v && "tab-active",
            )}
          >
            {l}
            {v === "unread" && unreadCount > 0 && (
              <span className="min-w-4 h-4 bg-brand-orange text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-surface-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Bell
              size={28}
              className="text-text-tertiary dark:text-slate-500"
            />
          </div>
          <p className="font-display font-bold text-xl text-text-primary dark:text-white mb-1">
            {filter === "unread" ? "All caught up!" : "No notifications"}
          </p>
          <p className="text-text-tertiary dark:text-slate-500 text-sm">
            {filter === "unread"
              ? "You've read everything."
              : "Nothing here yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n: any) => {
            const Icon = ICON_MAP[n.type] ?? Bell;
            const iconBg: Record<string, string> = {
              order_new: "bg-blue-50 dark:bg-blue-950/30 text-blue-600",
              order_update:
                "bg-purple-50 dark:bg-purple-950/30 text-purple-600",
              payment: "bg-green-50 dark:bg-green-950/30 text-brand-green",
              message: "bg-brand-orange/10 text-brand-orange",
              review: "bg-amber-50 dark:bg-amber-950/30 text-brand-amber",
              kyc: "bg-brand-navy/5 dark:bg-brand-navy/20 text-brand-navy dark:text-white",
              promotion: "bg-pink-50 dark:bg-pink-950/30 text-pink-600",
              security: "bg-red-50 dark:bg-red-950/30 text-red-500",
              system:
                "bg-surface-100 dark:bg-dark-card text-text-secondary dark:text-slate-400",
            };
            const iconClass = iconBg[n.type] ?? iconBg.system;

            return (
              <button
                key={n._id}
                type="button"
                onClick={() => !n.isRead && markRead.mutate([n._id])}
                className={cn(
                  "card w-full text-left p-4 flex items-start gap-3.5 transition-all hover:border-brand-orange/20",
                  !n.isRead &&
                    "border-brand-orange/20 bg-brand-orange-50/20 dark:bg-brand-orange/5",
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    iconClass,
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="font-semibold text-sm text-text-primary dark:text-white leading-tight">
                    {n.title}
                  </p>
                  <p className="text-sm text-text-secondary dark:text-slate-400 mt-0.5 leading-relaxed">
                    {n.body}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1.5">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </div>
                {!n.isRead && (
                  <div
                    className="w-2.5 h-2.5 bg-brand-orange rounded-full shrink-0 mt-1"
                    aria-label="Unread"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
