import { Spinner } from "@/components/common/LoadingScreen";
import {
  useCreateReview,
  useOrder,
  useReviewStatus,
  useUpdateReview,
} from "@/hooks/useApi";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function useOrderId() {
  return new URLSearchParams(window.location.search).get("orderId") ?? "";
}

export default function ReviewsPage() {
  const navigate = useNavigate();
  const orderId = useOrderId();
  const { data: order } = useOrder(orderId);
  const { data: reviewStatus, isLoading: statusLoading } =
    useReviewStatus(orderId);
  const createReview = useCreateReview();
  const updateReview = useUpdateReview();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  const o = order as any;

  useEffect(() => {
    const existing = (reviewStatus as any)?.review;
    if (!existing) return;

    setRating(Number(existing.rating || 0));
    setComment(String(existing.comment || ""));
  }, [reviewStatus]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const status = reviewStatus as any;

    if (status && !status.canWrite && !status.canEdit) {
      toast.error("This order is not eligible for a review yet.");
      return;
    }

    if (!rating) {
      toast.error("Please select a star rating");
      return;
    }
    if (comment.length < 10) {
      toast.error("Review must be at least 10 characters");
      return;
    }

    if (status?.canEdit && status?.review?._id) {
      await updateReview.mutateAsync({
        reviewId: status.review._id,
        rating,
        comment,
      });
    } else {
      await createReview.mutateAsync({ orderId, rating, comment });
    }

    navigate({ to: `/orders/${orderId}` });
  };

  const status = reviewStatus as any;
  const isBlocked = status && !status.canWrite && !status.canEdit;
  const isSaving = createReview.isPending || updateReview.isPending;

  return (
    <div className="page-container py-16 max-w-xl animate-fade-in">
      <button
        type="button"
        onClick={() => navigate({ to: `/orders/${orderId}` })}
        className="btn-ghost mb-6 flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={14} /> Back to order
      </button>

      <div className="card p-8">
        <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white mb-2">
          {status?.canEdit ? "Update Your Review" : "Leave a Review"}
        </h1>
        {o && (
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-6">
            For order #{o.orderNumber}
          </p>
        )}

        {statusLoading ? (
          <div className="mb-5 p-3 rounded-xl bg-surface-50 dark:bg-dark-hover">
            <p className="text-sm text-text-secondary dark:text-slate-400 flex items-center gap-2">
              <Spinner size={14} className="text-brand-orange" />
              Checking review eligibility...
            </p>
          </div>
        ) : isBlocked ? (
          <div className="mb-5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Reviews are available after the order is completed and only for
              the buyer.
            </p>
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-6">
          {/* Star rating */}
          <div className="text-center">
            <p className="label mb-3">Overall rating</p>
            <div
              className="flex justify-center gap-2"
              role="group"
              aria-label="Star rating"
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    size={36}
                    className={cn(
                      "transition-colors",
                      (hover || rating) >= n
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-surface-300 dark:text-dark-border",
                    )}
                  />
                </button>
              ))}
            </div>
            {(hover || rating) > 0 && (
              <p className="text-sm text-text-secondary dark:text-slate-400 mt-2">
                {
                  ["", "Poor", "Fair", "Good", "Great", "Excellent!"][
                    hover || rating
                  ]
                }
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="label">Your review</label>
            <textarea
              className="input resize-y min-h-30"
              placeholder="Share details about your experience — what went well, what could be improved, would you recommend this seller?"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 text-right">
              {comment.length}/1000
            </p>
          </div>

          <div className="p-3 bg-surface-50 dark:bg-dark-hover rounded-xl text-xs text-text-secondary dark:text-slate-400">
            Reviews are public. Be honest and specific — your feedback helps
            other buyers make informed decisions.
          </div>

          <button
            type="submit"
            className="btn-primary w-full py-3 text-base"
            disabled={isSaving || !rating || isBlocked}
          >
            {isSaving ? (
              <>
                <Spinner size={14} className="text-white" />
                {status?.canEdit ? "Updating…" : "Submitting…"}
              </>
            ) : status?.canEdit ? (
              "Update Review"
            ) : (
              "Submit Review"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
