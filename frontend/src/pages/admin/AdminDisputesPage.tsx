import LoadingScreen from "@/components/common/LoadingScreen";
import { useAdminDisputes, useResolveAdminDispute } from "@/hooks/useApi";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  Shield,
} from "lucide-react";
import { useState } from "react";

export default function AdminDisputesPage() {
  const [filter, setFilter] = useState("");
  const [resolutionModal, setResolutionModal] = useState<{
    disputeId: string;
    resolution: "in_progress" | "completed" | "cancelled" | "refunded";
    title: string;
    defaultNote: string;
  } | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const { data, isLoading } = useAdminDisputes(
    filter ? { status: filter } : {},
  );
  const resolveDispute = useResolveAdminDispute();
  const disputes: any[] =
    (data as any)?.data?.data ?? (data as any)?.data ?? [];

  const openResolutionModal = (
    disputeId: string,
    resolution: "in_progress" | "completed" | "cancelled" | "refunded",
    title: string,
    defaultNote: string,
  ) => {
    setResolutionModal({ disputeId, resolution, title, defaultNote });
    setResolutionNote(defaultNote);
  };

  const closeResolutionModal = () => {
    if (resolveDispute.isPending) return;
    setResolutionModal(null);
    setResolutionNote("");
  };

  const submitResolution = async () => {
    if (!resolutionModal) return;

    try {
      await resolveDispute.mutateAsync({
        disputeId: resolutionModal.disputeId,
        resolution: resolutionModal.resolution,
        note: resolutionNote.trim() || undefined,
      });
      setResolutionModal(null);
      setResolutionNote("");
    } catch {
      // toast is handled by the mutation hook
    }
  };

  const statusCfg: Record<string, { color: string; icon: any; label: string }> =
    {
      open: { color: "badge-red", icon: AlertTriangle, label: "Open" },
      under_review: { color: "badge-amber", icon: Clock, label: "Reviewing" },
      resolved: { color: "badge-green", icon: CheckCircle, label: "Resolved" },
      closed: { color: "badge-gray", icon: CheckCircle, label: "Closed" },
    };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield size={20} className="text-brand-orange" />
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
              Dispute Management
            </h1>
          </div>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            Review and resolve buyer/seller disputes
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar w-fit mb-6">
        {[
          ["", "All"],
          ["open", "Open"],
          ["under_review", "Under Review"],
          ["resolved", "Resolved"],
        ].map(([v, l]) => (
          <button
            key={v}
            type="button"
            onClick={() => setFilter(v)}
            className={cn("tab", filter === v && "tab-active")}
          >
            {l}
          </button>
        ))}
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : disputes.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield size={28} className="text-brand-green" />
          </div>
          <p className="font-display font-bold text-xl text-text-primary dark:text-white">
            No {filter || "active"} disputes
          </p>
          <p className="text-text-tertiary dark:text-slate-500 text-sm mt-1">
            {filter === "open"
              ? "All disputes are being handled."
              : "Nothing to show here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {disputes.map((d: any) => {
            const cfg = statusCfg[d.status] ?? statusCfg.open;
            const Icon = cfg.icon;
            return (
              <div
                key={d._id}
                className="card p-5 hover:border-brand-orange/20 transition-all"
              >
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={cn("badge", cfg.color)}>
                        <Icon size={11} className="inline mr-1" />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-text-tertiary dark:text-slate-500">
                        {formatRelativeTime(d.createdAt)}
                      </span>
                      {d.order?.orderNumber && (
                        <span className="badge badge-gray">
                          #{d.order.orderNumber}
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-text-primary dark:text-white mb-1">
                      {d.reason || "Order dispute"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-text-tertiary dark:text-slate-500 mt-2">
                      <span>
                        Raised by:{" "}
                        <span className="text-text-secondary dark:text-slate-300 font-medium">
                          {d.raisedBy?.fullName ?? "Unknown"}
                        </span>
                      </span>
                      <span>
                        Against:{" "}
                        <span className="text-text-secondary dark:text-slate-300 font-medium">
                          {d.against?.fullName ?? "Unknown"}
                        </span>
                      </span>
                      {d.order?.total && (
                        <span>
                          Amount:{" "}
                          <span className="font-bold text-text-primary dark:text-white">
                            {formatCurrency(d.order.total)}
                          </span>
                        </span>
                      )}
                    </div>
                    {d.description && (
                      <p className="text-sm text-text-secondary dark:text-slate-400 mt-2 line-clamp-2">
                        {d.description}
                      </p>
                    )}
                    {d.audit?.latest?.resolvedAt && (
                      <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2">
                        Last resolution:{" "}
                        {d.audit.latest.resolution || "updated"} by{" "}
                        {d.audit.latest.resolvedBy?.fullName || "Support"} ·{" "}
                        {formatRelativeTime(d.audit.latest.resolvedAt)}
                      </p>
                    )}
                    {Array.isArray(d.audit?.entries) &&
                      d.audit.entries.length > 0 && (
                        <div className="mt-3 space-y-2 border-t border-surface-100 dark:border-dark-border pt-3">
                          <p className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary dark:text-slate-500">
                            Audit Timeline
                          </p>
                          {d.audit.entries
                            .slice(0, 3)
                            .map((entry: any, index: number) => (
                              <div
                                key={`${d._id}-audit-${index}`}
                                className="rounded-lg bg-surface-50 dark:bg-dark-card px-3 py-2"
                              >
                                <p className="text-xs font-medium text-text-primary dark:text-white">
                                  {entry.resolution || "updated"} by{" "}
                                  {entry.resolvedBy?.fullName || "Support"}
                                </p>
                                <p className="text-[11px] text-text-tertiary dark:text-slate-500 mt-0.5">
                                  {formatRelativeTime(entry.resolvedAt)}
                                </p>
                                {entry.note && (
                                  <p className="text-xs text-text-secondary dark:text-slate-400 mt-1">
                                    {entry.note}
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {d.order?._id && (
                      <Link
                        to="/orders/$id"
                        params={{ id: d.order._id }}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <ExternalLink size={11} />
                        View Order
                      </Link>
                    )}
                    {d.status === "open" && (
                      <button
                        type="button"
                        onClick={() =>
                          openResolutionModal(
                            d._id,
                            "in_progress",
                            "Mark Dispute Under Review",
                            "Support started mediation and evidence review.",
                          )
                        }
                        disabled={resolveDispute.isPending}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <MessageSquare size={11} />
                        Mark Under Review
                      </button>
                    )}
                    {(d.status === "open" || d.status === "under_review") && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            openResolutionModal(
                              d._id,
                              "completed",
                              "Release Funds to Seller",
                              "Support resolved this dispute in favor of delivery completion.",
                            )
                          }
                          disabled={resolveDispute.isPending}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          Release to Seller
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openResolutionModal(
                              d._id,
                              "refunded",
                              "Refund Buyer",
                              "Support resolved this dispute with a refund.",
                            )
                          }
                          disabled={resolveDispute.isPending}
                          className="btn-danger text-xs py-1.5 px-3"
                        >
                          Refund Buyer
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            openResolutionModal(
                              d._id,
                              "cancelled",
                              "Cancel Order",
                              "Support cancelled this order after reviewing the dispute.",
                            )
                          }
                          disabled={resolveDispute.isPending}
                          className="btn-secondary text-xs py-1.5 px-3"
                        >
                          Cancel Order
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {resolutionModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="font-display font-bold text-xl text-text-primary dark:text-white">
              {resolutionModal.title}
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
              Add an internal note to document why this dispute is being
              updated.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-semibold text-text-tertiary dark:text-slate-400 mb-2">
                Resolution Note
              </label>
              <textarea
                className="input min-h-28 resize-y"
                value={resolutionNote}
                onChange={(e) => setResolutionNote(e.target.value)}
                maxLength={500}
                placeholder="Add context for the buyer, seller, and support history"
              />
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={closeResolutionModal}
                disabled={resolveDispute.isPending}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitResolution}
                disabled={resolveDispute.isPending}
                className="btn-primary"
              >
                {resolveDispute.isPending ? "Saving..." : "Confirm Resolution"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
