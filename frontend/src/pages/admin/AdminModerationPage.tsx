import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import { useAdminContentQueue, useAdminModerateContent } from "@/hooks/useApi";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Flag,
  Search,
  Shield,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";

type ModerationModalState = {
  type: "job" | "service" | "product";
  id: string;
  title: string;
  action: "approve" | "flag" | "remove" | "restore";
} | null;

const moderationColor: Record<string, string> = {
  approved: "badge-green",
  pending_review: "badge-amber",
  blocked: "badge-red",
};

export default function AdminModerationPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [moderationStatus, setModerationStatus] = useState("");
  const [listingStatus, setListingStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState("");
  const [modal, setModal] = useState<ModerationModalState>(null);

  const params: Record<string, string | number> = { page, limit: 20, type };
  if (search.trim()) params.search = search.trim();
  if (moderationStatus) params.moderationStatus = moderationStatus;
  if (listingStatus) params.status = listingStatus;

  const { data, isLoading } = useAdminContentQueue(params);
  const moderateContent = useAdminModerateContent();

  const rows: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
  const pagination =
    (data as any)?.data?.pagination ?? (data as any)?.pagination;

  const statusOptions = useMemo(() => {
    if (type === "job") {
      return ["open", "in_progress", "completed", "closed", "cancelled"];
    }
    if (type === "service") {
      return ["active", "draft", "paused", "suspended"];
    }
    if (type === "product") {
      return ["active", "draft", "sold", "paused", "suspended"];
    }
    return [];
  }, [type]);

  const closeModal = () => {
    if (moderateContent.isPending) return;
    setModal(null);
    setReason("");
  };

  const requiresReason = modal?.action === "flag" || modal?.action === "remove";

  const submitAction = async () => {
    if (!modal) return;
    if (requiresReason && reason.trim().length < 5) return;

    try {
      await moderateContent.mutateAsync({
        type: modal.type,
        id: modal.id,
        action: modal.action,
        reason: reason.trim() || undefined,
      });
      closeModal();
    } catch {
      // toast handled in hook
    }
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Shield size={20} className="text-brand-orange" />
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
              Content Moderation
            </h1>
          </div>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            Review, flag, remove, and restore platform listings with full
            governance control.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-8 w-64 text-sm"
            placeholder="Search title, description, owner"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="input w-40 text-sm"
          value={type}
          onChange={(event) => {
            setType(event.target.value);
            setPage(1);
            setListingStatus("");
          }}
        >
          <option value="all">All types</option>
          <option value="job">Jobs</option>
          <option value="service">Services</option>
          <option value="product">Products</option>
        </select>

        <select
          className="input w-44 text-sm"
          value={moderationStatus}
          onChange={(event) => {
            setModerationStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All moderation states</option>
          <option value="approved">Approved</option>
          <option value="pending_review">Pending review</option>
          <option value="blocked">Blocked</option>
        </select>

        <select
          className="input w-44 text-sm"
          value={listingStatus}
          onChange={(event) => {
            setListingStatus(event.target.value);
            setPage(1);
          }}
          disabled={type === "all"}
        >
          <option value="">All listing states</option>
          {statusOptions.map((entry) => (
            <option key={entry} value={entry}>
              {entry.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <LoadingScreen />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-50 dark:bg-dark-card border-b border-surface-200 dark:border-dark-border">
                <tr>
                  {[
                    "Listing",
                    "Type",
                    "Owner",
                    "Status",
                    "Moderation",
                    "Updated",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wide"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-text-tertiary dark:text-slate-500"
                    >
                      No content matches this moderation filter.
                    </td>
                  </tr>
                ) : (
                  rows.map((entry) => {
                    const moderation = entry.moderation || {};
                    const typeLabel = String(entry.type || "").toUpperCase();

                    return (
                      <tr
                        key={`${entry.type}-${entry._id}`}
                        className="border-b border-surface-100 dark:border-dark-border last:border-0 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                      >
                        <td className="px-4 py-3 align-top">
                          <p className="font-medium text-text-primary dark:text-white line-clamp-1">
                            {entry.title}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                            {entry.category}
                          </p>
                          <a
                            href={entry.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline mt-2"
                          >
                            <ExternalLink size={11} /> Open listing
                          </a>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span className="badge badge-blue">{typeLabel}</span>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <p className="text-xs text-text-primary dark:text-white">
                            {entry.owner?.fullName || "Unknown"}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                            @{entry.owner?.username || "unknown"}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span className="badge badge-gray capitalize">
                            {String(entry.status || "unknown").replaceAll(
                              "_",
                              " ",
                            )}
                          </span>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              "badge capitalize",
                              moderationColor[
                                moderation.status || "approved"
                              ] || "badge-gray",
                            )}
                          >
                            {String(moderation.status || "approved").replaceAll(
                              "_",
                              " ",
                            )}
                          </span>
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                            Score: {moderation.score ?? 0}
                          </p>
                          {Array.isArray(moderation.reasons) &&
                          moderation.reasons.length > 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 line-clamp-2">
                              {moderation.reasons[0]}
                            </p>
                          ) : null}
                        </td>

                        <td className="px-4 py-3 align-top text-xs text-text-tertiary dark:text-slate-500">
                          <p>{formatDate(entry.updatedAt)}</p>
                          <p className="mt-1">
                            {formatRelativeTime(entry.updatedAt)}
                          </p>
                        </td>

                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              className="btn-secondary text-xs py-1.5 px-3"
                              onClick={() => {
                                setModal({
                                  type: entry.type,
                                  id: entry._id,
                                  title: entry.title,
                                  action: "approve",
                                });
                                setReason("");
                              }}
                              disabled={moderateContent.isPending}
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>

                            <button
                              type="button"
                              className="btn-secondary text-xs py-1.5 px-3"
                              onClick={() => {
                                setModal({
                                  type: entry.type,
                                  id: entry._id,
                                  title: entry.title,
                                  action: "flag",
                                });
                                setReason("");
                              }}
                              disabled={moderateContent.isPending}
                            >
                              <Flag size={12} /> Flag
                            </button>

                            <button
                              type="button"
                              className="btn-danger text-xs py-1.5 px-3"
                              onClick={() => {
                                setModal({
                                  type: entry.type,
                                  id: entry._id,
                                  title: entry.title,
                                  action: "remove",
                                });
                                setReason("");
                              }}
                              disabled={moderateContent.isPending}
                            >
                              <Trash2 size={12} /> Remove
                            </button>

                            <button
                              type="button"
                              className="btn-secondary text-xs py-1.5 px-3"
                              onClick={() => {
                                setModal({
                                  type: entry.type,
                                  id: entry._id,
                                  title: entry.title,
                                  action: "restore",
                                });
                                setReason("");
                              }}
                              disabled={moderateContent.isPending}
                            >
                              <ShieldOff size={12} /> Restore
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 ? (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-dark-border">
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                Page {pagination.page} of {pagination.pages} ·{" "}
                {pagination.total} total
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-xs py-1.5 px-3"
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary text-xs py-1.5 px-3"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {modal ? (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}
        >
          <div className="card w-full max-w-md p-6">
            <h2 className="font-display font-bold text-xl text-text-primary dark:text-white">
              {modal.action === "approve"
                ? "Approve listing"
                : modal.action === "flag"
                  ? "Flag listing"
                  : modal.action === "remove"
                    ? "Remove listing"
                    : "Restore listing"}
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-1 line-clamp-2">
              {modal.title}
            </p>

            <div className="mt-4">
              <label className="label">
                {requiresReason
                  ? "Moderation Reason (required)"
                  : "Moderation Note (optional)"}
              </label>
              <textarea
                className="input min-h-28 resize-y"
                value={reason}
                maxLength={300}
                onChange={(event) => setReason(event.target.value)}
                placeholder={
                  requiresReason
                    ? "Explain why this action is required"
                    : "Optional note"
                }
              />
            </div>

            {requiresReason ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Flag and remove actions require at least 5 characters.
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModal}
                disabled={moderateContent.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  modal.action === "remove" ? "btn-danger" : "btn-primary"
                }
                onClick={submitAction}
                disabled={
                  moderateContent.isPending ||
                  (requiresReason && reason.trim().length < 5)
                }
              >
                {moderateContent.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size={13} className="text-white" /> Saving...
                  </span>
                ) : (
                  "Confirm"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
