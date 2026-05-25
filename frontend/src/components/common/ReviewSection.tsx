import {
  useRespondToReview,
  useReviews,
  useToggleReviewHelpful,
} from "@/hooks/useApi";
import { cn, formatRelativeTime, getInitials } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { MessageSquareReply, Send, Star, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "./LoadingScreen";

type ReviewRefType = "service" | "product" | "job";

type ReviewSectionProps = {
  refType: ReviewRefType;
  refId: string;
  emptyMessage?: string;
};

const SORT_OPTIONS: Array<{
  value: "newest" | "highest" | "lowest" | "helpful";
  label: string;
}> = [
  { value: "newest", label: "Newest" },
  { value: "highest", label: "Highest rated" },
  { value: "lowest", label: "Lowest rated" },
  { value: "helpful", label: "Most helpful" },
];

const RATING_FILTER_OPTIONS = [
  { value: 0, label: "All ratings" },
  { value: 5, label: "5 stars" },
  { value: 4, label: "4 stars" },
  { value: 3, label: "3 stars" },
  { value: 2, label: "2 stars" },
  { value: 1, label: "1 star" },
];

const toFallbackSummary = (items: any[]) => {
  if (!items.length) {
    return {
      averageRating: 0,
      totalReviews: 0,
      ratingBreakdown: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    };
  }

  const total = items.length;
  const sum = items.reduce((acc, item) => acc + Number(item.rating || 0), 0);
  const ratingBreakdown = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };

  for (const item of items) {
    const key = String(Math.min(5, Math.max(1, Number(item.rating || 0)))) as
      | "1"
      | "2"
      | "3"
      | "4"
      | "5";
    ratingBreakdown[key] += 1;
  }

  return {
    averageRating: Math.round((sum / total) * 10) / 10,
    totalReviews: total,
    ratingBreakdown,
  };
};

export default function ReviewSection({
  refType,
  refId,
  emptyMessage = "No reviews yet.",
}: ReviewSectionProps) {
  const { user, isAuthenticated } = useAuthStore();
  const [sort, setSort] = useState<"newest" | "highest" | "lowest" | "helpful">(
    "newest",
  );
  const [ratingFilter, setRatingFilter] = useState(0);
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  const respondToReview = useRespondToReview();
  const toggleHelpful = useToggleReviewHelpful();

  const { data, isLoading } = useReviews(refType, refId, {
    sort,
    rating: ratingFilter || undefined,
    limit: 20,
    page: 1,
  });

  const items = useMemo(() => {
    if (Array.isArray(data)) return data;
    return (data as any)?.items ?? [];
  }, [data]);

  const summary = useMemo(() => {
    if (!Array.isArray(data) && (data as any)?.summary)
      return (data as any).summary;
    return toFallbackSummary(items);
  }, [data, items]);

  const isAdmin = ["admin", "superadmin"].includes(String(user?.role || ""));

  const setReplyDraft = (reviewId: string, text: string) => {
    setReplyDrafts((prev) => ({ ...prev, [reviewId]: text }));
  };

  const handleSubmitResponse = async (reviewId: string) => {
    const text = String(replyDrafts[reviewId] || "").trim();
    if (text.length < 2) {
      toast.error("Response must be at least 2 characters");
      return;
    }

    await respondToReview.mutateAsync({ reviewId, text });
    setReplyDraft(reviewId, "");
    setActiveReplyId(null);
  };

  if (isLoading) {
    return (
      <div className="card p-8 flex justify-center">
        <Spinner size={24} className="text-brand-orange" />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="card p-8 text-center">
        <p className="text-sm text-text-tertiary dark:text-slate-500">
          {emptyMessage}
        </p>
      </div>
    );
  }

  const totalReviews = Number(summary?.totalReviews || 0);
  const avg = Number(summary?.averageRating || 0);
  const ratingBreakdown = summary?.ratingBreakdown || {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
  };

  return (
    <div className="card p-6 space-y-5">
      <div className="flex flex-col md:flex-row gap-5">
        <div className="md:w-42 text-center md:text-left">
          <p className="font-display font-black text-4xl text-brand-navy dark:text-white">
            {avg.toFixed(1)}
          </p>
          <div className="flex gap-0.5 justify-center md:justify-start mt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                size={14}
                className={cn(
                  i < Math.round(avg)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-surface-300 dark:text-dark-border",
                )}
              />
            ))}
          </div>
          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
            {totalReviews} review{totalReviews !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = Number(ratingBreakdown[String(n)] || 0);
            const width = totalReviews ? (count / totalReviews) * 100 : 0;
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-2 text-text-tertiary dark:text-slate-500">
                  {n}
                </span>
                <Star size={10} className="text-yellow-400 fill-yellow-400" />
                <div className="flex-1 h-1.5 bg-surface-200 dark:bg-dark-border rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400 rounded-full"
                    style={{ width: `${width}%` }}
                  />
                </div>
                <span className="w-5 text-right text-text-tertiary dark:text-slate-500">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          className="input text-sm sm:w-44"
          value={sort}
          onChange={(event) => setSort(event.target.value as any)}
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          className="input text-sm sm:w-36"
          value={ratingFilter}
          onChange={(event) => setRatingFilter(Number(event.target.value) || 0)}
        >
          {RATING_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-4 divide-y divide-surface-100 dark:divide-dark-border">
        {items.map((review: any) => {
          const canVoteHelpful =
            isAuthenticated &&
            String(review.reviewer?._id || review.reviewer) !==
              String(user?._id || "");

          const canRespond =
            isAuthenticated &&
            (String(review.reviewee || "") === String(user?._id || "") ||
              isAdmin);

          return (
            <div key={review._id} className="pt-4 first:pt-0">
              <div className="flex items-start gap-3">
                {review.reviewer?.avatar ? (
                  <img
                    src={review.reviewer.avatar}
                    alt=""
                    className="avatar w-9 h-9 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                    {getInitials(review.reviewer?.fullName ?? "U")}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-sm text-text-primary dark:text-white">
                      {review.reviewer?.fullName ?? "User"}
                    </p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={11}
                          className={cn(
                            i < Number(review.rating || 0)
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-surface-300 dark:text-dark-border",
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-text-tertiary dark:text-slate-500">
                      {formatRelativeTime(review.createdAt)}
                    </span>
                    {review.editedAt && (
                      <span className="text-[11px] text-text-tertiary dark:text-slate-500">
                        edited {formatRelativeTime(review.editedAt)}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-text-secondary dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {review.comment}
                  </p>

                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      className={cn(
                        "btn-ghost text-xs px-2.5 py-1.5",
                        review.isHelpful && "text-brand-orange",
                      )}
                      onClick={() => toggleHelpful.mutate(review._id)}
                      disabled={!canVoteHelpful || toggleHelpful.isPending}
                    >
                      <ThumbsUp size={12} /> Helpful (
                      {Number(review.helpfulCount || 0)})
                    </button>

                    {canRespond && !review.response?.text && (
                      <button
                        type="button"
                        className="btn-ghost text-xs px-2.5 py-1.5"
                        onClick={() =>
                          setActiveReplyId((prev) =>
                            prev === review._id ? null : review._id,
                          )
                        }
                      >
                        <MessageSquareReply size={12} /> Reply
                      </button>
                    )}
                  </div>

                  {review.response?.text && (
                    <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-dark-hover border border-surface-200 dark:border-dark-border">
                      <p className="text-xs font-semibold text-text-primary dark:text-white mb-1">
                        Seller response
                      </p>
                      <p className="text-sm text-text-secondary dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                        {review.response.text}
                      </p>
                      <p className="text-[11px] text-text-tertiary dark:text-slate-500 mt-1">
                        {review.response?.responder?.fullName
                          ? `${review.response.responder.fullName} • `
                          : ""}
                        {formatRelativeTime(review.response.respondedAt)}
                      </p>
                    </div>
                  )}

                  {canRespond &&
                    activeReplyId === review._id &&
                    !review.response?.text && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          className="input min-h-20 resize-y"
                          placeholder="Write a helpful public response..."
                          value={replyDrafts[review._id] || ""}
                          onChange={(event) =>
                            setReplyDraft(review._id, event.target.value)
                          }
                          maxLength={2000}
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() => {
                              setActiveReplyId(null);
                              setReplyDraft(review._id, "");
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-primary text-xs"
                            onClick={() => handleSubmitResponse(review._id)}
                            disabled={respondToReview.isPending}
                          >
                            {respondToReview.isPending ? (
                              <>
                                <Spinner size={12} className="text-white" />{" "}
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send size={12} /> Post response
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
