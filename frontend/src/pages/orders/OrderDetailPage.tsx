import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import {
  getWriteReviewUrl,
  useCompleteOrder,
  useOrder,
  useReviewStatus,
  useUpdateOrderStatus,
} from "@/hooks/useApi";
import {
  cn,
  formatCurrency,
  formatDate,
  getOrderStatusColor,
} from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  MessageSquare,
  Package,
  RefreshCw,
  Shield,
  Truck,
} from "lucide-react";
import { useState } from "react";

function useOrderId() {
  const parts = window.location.pathname.split("/");
  const idx = parts.indexOf("orders");
  return idx !== -1 ? (parts[idx + 1] ?? "") : "";
}

const STATUS_STEPS = [
  "pending",
  "confirmed",
  "in_progress",
  "delivered",
  "completed",
];

export default function OrderDetailPage() {
  const id = useOrderId();
  const { user } = useAuthStore();
  const { data: order, isLoading, refetch } = useOrder(id);
  const { data: reviewStatus } = useReviewStatus(id);
  const complete = useCompleteOrder(id);
  const updateStatus = useUpdateOrderStatus(id);
  const [revisionNote, setRevisionNote] = useState("");
  const [showRevision, setShowRevision] = useState(false);

  if (isLoading) return <LoadingScreen />;
  if (!order)
    return (
      <div className="page-container py-20 text-center">
        <p className="text-text-secondary dark:text-slate-400">
          Order not found.
        </p>
        <Link to="/orders" className="btn-secondary mt-4">
          ← Back to Orders
        </Link>
      </div>
    );

  const o = order as any;
  const review = reviewStatus as any;
  const isBuyer = String(o.buyer?._id ?? o.buyer) === String(user?._id);
  const isSeller = String(o.seller?._id ?? o.seller) === String(user?._id);
  const curStep = STATUS_STEPS.indexOf(o.status);

  return (
    <div className="page-container py-10 max-w-3xl animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-8">
        <Link
          to="/orders"
          className="text-text-tertiary dark:text-slate-500 hover:text-brand-orange transition-colors"
        >
          Orders
        </Link>
        <ChevronRight size={14} className="text-text-disabled" />
        <span className="text-text-primary dark:text-white font-medium">
          {o.orderNumber}
        </span>
      </nav>

      <div className="space-y-5">
        {/* Status header */}
        <div className="card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
            <div>
              <p className="text-xs text-text-tertiary dark:text-slate-500 mb-1">
                Order #{o.orderNumber}
              </p>
              <h1 className="font-display font-bold text-xl text-brand-navy dark:text-white capitalize">
                {o.orderType} Order
              </h1>
              <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                Placed {formatDate(o.createdAt, { dateStyle: "long" })}
              </p>
            </div>
            <span
              className={cn("badge text-sm", getOrderStatusColor(o.status))}
            >
              {o.status?.replace(/_/g, " ")}
            </span>
          </div>

          {/* Progress stepper */}
          {o.status !== "cancelled" && o.status !== "refunded" && (
            <div className="relative">
              <div className="absolute top-4 left-4 right-4 h-0.5 bg-surface-200 dark:bg-dark-border" />
              <div
                className="absolute top-4 left-4 h-0.5 bg-brand-orange transition-all duration-500"
                style={{
                  width: `${Math.max(0, curStep / (STATUS_STEPS.length - 1)) * 100}%`,
                }}
              />
              <div className="relative flex justify-between">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < curStep;
                  const current = i === curStep;
                  return (
                    <div
                      key={step}
                      className="flex flex-col items-center gap-2"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center z-10 border-2 transition-all",
                          done
                            ? "bg-brand-green border-brand-green"
                            : current
                              ? "bg-brand-orange border-brand-orange"
                              : "bg-surface-0 dark:bg-dark-card border-surface-300 dark:border-dark-border",
                        )}
                      >
                        {done ? (
                          <CheckCircle size={14} className="text-white" />
                        ) : (
                          <span
                            className={cn(
                              "text-xs font-bold",
                              current
                                ? "text-white"
                                : "text-text-tertiary dark:text-slate-500",
                            )}
                          >
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium capitalize hidden sm:block",
                          current
                            ? "text-brand-orange"
                            : "text-text-tertiary dark:text-slate-500",
                        )}
                      >
                        {step.replace(/_/g, " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Order details */}
        <div className="card p-6">
          <h2 className="font-semibold text-text-primary dark:text-white mb-4">
            Order Details
          </h2>
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-surface-100 dark:bg-dark-card rounded-xl flex items-center justify-center shrink-0">
              <Package
                size={24}
                className="text-text-tertiary dark:text-slate-500"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-text-primary dark:text-white">
                {o.service?.title ?? o.orderType + " order"}
              </p>
              {o.pricingTier && (
                <p className="text-sm text-text-secondary dark:text-slate-400 mt-0.5 capitalize">
                  {o.pricingTier} package
                </p>
              )}
              {o.dueDate && (
                <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2 flex items-center gap-1">
                  <Clock size={11} />
                  Due {formatDate(o.dueDate)}
                </p>
              )}
              {o.requirements && (
                <div className="mt-3 p-3 bg-surface-50 dark:bg-dark-hover rounded-xl text-sm text-text-secondary dark:text-slate-300 leading-relaxed">
                  <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 mb-1">
                    Requirements
                  </p>
                  {o.requirements}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Payment summary */}
        <div className="card p-6">
          <h2 className="font-semibold text-text-primary dark:text-white mb-4">
            Payment Summary
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-text-secondary dark:text-slate-300">
              <span>Subtotal</span>
              <span>{formatCurrency(o.subtotal ?? o.total)}</span>
            </div>
            {o.platformFee > 0 && (
              <div className="flex justify-between text-text-secondary dark:text-slate-300">
                <span>Platform fee</span>
                <span>{formatCurrency(o.platformFee)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-text-primary dark:text-white border-t border-surface-200 dark:border-dark-border pt-2 mt-2">
              <span>Total</span>
              <span className="text-brand-orange text-base">
                {formatCurrency(o.total)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
            <Shield size={14} className="text-brand-green shrink-0" />
            <p className="text-xs text-text-secondary dark:text-slate-300">
              Funds held in escrow until you confirm completion.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="card p-5">
          <div className="flex flex-wrap gap-3">
            {isSeller && o.status === "in_progress" && (
              <button
                type="button"
                onClick={async () => {
                  await updateStatus.mutateAsync({
                    status: "delivered",
                    note: "Work delivered",
                  });
                  refetch();
                }}
                disabled={updateStatus.isPending}
                className="btn-primary"
              >
                {updateStatus.isPending ? (
                  <Spinner size={14} className="text-white" />
                ) : (
                  <>
                    <Truck size={14} />
                    Mark as Delivered
                  </>
                )}
              </button>
            )}
            {isBuyer && o.status === "delivered" && (
              <>
                <button
                  type="button"
                  onClick={async () => {
                    await complete.mutateAsync();
                    refetch();
                  }}
                  disabled={complete.isPending}
                  className="btn-primary"
                >
                  {complete.isPending ? (
                    <Spinner size={14} className="text-white" />
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      Complete & Release Payment
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRevision((p) => !p)}
                  className="btn-secondary"
                >
                  <RefreshCw size={14} />
                  Request Revision
                </button>
              </>
            )}
            {isBuyer &&
              o.status === "completed" &&
              (review?.canWrite || review?.canEdit) && (
                <Link to={getWriteReviewUrl(o._id)} className="btn-primary">
                  <CheckCircle size={14} />
                  {review?.canEdit ? "Edit Review" : "Write Review"}
                </Link>
              )}
            <Link to="/messages" className="btn-secondary">
              <MessageSquare size={14} />
              Message
            </Link>
            {["in_progress", "delivered"].includes(o.status) && (
              <button
                type="button"
                className="btn-ghost text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <AlertTriangle size={14} />
                Dispute
              </button>
            )}
          </div>

          {showRevision && (
            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-dark-border">
              <label className="label">Describe what needs to change</label>
              <textarea
                className="input resize-y min-h-20 mt-1"
                placeholder="Please explain the changes needed…"
                value={revisionNote}
                onChange={(e) => setRevisionNote(e.target.value)}
              />
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => setShowRevision(false)}
                  className="btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!revisionNote.trim() || updateStatus.isPending}
                  className="btn-primary text-sm"
                  onClick={async () => {
                    await updateStatus.mutateAsync({
                      status: "revision_requested",
                      note: revisionNote,
                    });
                    setShowRevision(false);
                    refetch();
                  }}
                >
                  {updateStatus.isPending ? (
                    <Spinner size={13} className="text-white" />
                  ) : (
                    "Submit Revision Request"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
