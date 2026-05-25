import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import {
  useAdminKycSubmissions,
  useAdminReviewKycSubmission,
} from "@/hooks/useApi";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useState } from "react";

type ReviewModalState = {
  userId: string;
  fullName: string;
  decision: "approved" | "rejected";
} | null;

const statusToBadge: Record<string, string> = {
  pending: "badge-amber",
  approved: "badge-green",
  rejected: "badge-red",
  not_submitted: "badge-gray",
};

export default function AdminKYCPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [reason, setReason] = useState("");
  const [modal, setModal] = useState<ReviewModalState>(null);

  const params: Record<string, string | number> = { page, limit: 20 };
  if (search.trim()) params.search = search.trim();
  if (status) params.status = status;

  const { data, isLoading } = useAdminKycSubmissions(params);
  const reviewKyc = useAdminReviewKycSubmission();

  const rows: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
  const pagination =
    (data as any)?.data?.pagination ?? (data as any)?.pagination;

  const closeModal = () => {
    if (reviewKyc.isPending) return;
    setModal(null);
    setReason("");
  };

  const submitDecision = async () => {
    if (!modal) return;

    if (modal.decision === "rejected" && reason.trim().length < 5) {
      return;
    }

    try {
      await reviewKyc.mutateAsync({
        userId: modal.userId,
        decision: modal.decision,
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
            <ShieldCheck size={20} className="text-brand-orange" />
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
              KYC Management
            </h1>
          </div>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            Review identity verification submissions with full audit trace.
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
            value={search}
            placeholder="Search by name, username, email"
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
          />
        </div>

        <select
          className="input w-52 text-sm"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
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
                    "User",
                    "KYC",
                    "Document",
                    "Automation",
                    "Submitted",
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
                      colSpan={6}
                      className="px-4 py-12 text-center text-text-tertiary dark:text-slate-500"
                    >
                      No KYC submissions found.
                    </td>
                  </tr>
                ) : (
                  rows.map((item) => {
                    const kyc = item.kyc || {};
                    const automation = kyc.automation || {};

                    return (
                      <tr
                        key={item._id}
                        className="border-b border-surface-100 dark:border-dark-border last:border-0 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-text-primary dark:text-white">
                            {item.fullName}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500">
                            @{item.username}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500">
                            {item.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={cn(
                              "badge capitalize",
                              statusToBadge[kyc.status || "not_submitted"] ||
                                "badge-gray",
                            )}
                          >
                            {String(kyc.status || "not_submitted").replaceAll(
                              "_",
                              " ",
                            )}
                          </span>
                          {kyc.rejectionReason ? (
                            <p className="text-xs text-red-500 mt-2 max-w-52">
                              {kyc.rejectionReason}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs text-text-secondary dark:text-slate-300 capitalize">
                            {kyc.documentType || "unknown"}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                            {kyc.documentNumberMasked || ""}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {(kyc.documents || [])
                              .slice(0, 2)
                              .map((url: string) => (
                                <a
                                  key={url}
                                  href={url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-brand-orange hover:underline"
                                >
                                  <FileText size={11} /> View
                                </a>
                              ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <p className="text-xs text-text-secondary dark:text-slate-300 capitalize">
                            {automation.decision
                              ? String(automation.decision).replaceAll("_", " ")
                              : "manual review"}
                          </p>
                          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                            Risk score: {automation.riskScore ?? 0}
                          </p>
                          {Array.isArray(automation.reasons) &&
                          automation.reasons.length > 0 ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 line-clamp-2">
                              {automation.reasons[0]}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-text-tertiary dark:text-slate-500">
                          <p>{formatDate(kyc.submittedAt)}</p>
                          <p className="mt-1">
                            {kyc.submittedAt
                              ? formatRelativeTime(kyc.submittedAt)
                              : "--"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="btn-secondary text-xs py-1.5 px-3"
                              onClick={() => {
                                setModal({
                                  userId: item._id,
                                  fullName: item.fullName,
                                  decision: "approved",
                                });
                                setReason("");
                              }}
                              disabled={reviewKyc.isPending}
                            >
                              <CheckCircle2 size={12} /> Approve
                            </button>
                            <button
                              type="button"
                              className="btn-danger text-xs py-1.5 px-3"
                              onClick={() => {
                                setModal({
                                  userId: item._id,
                                  fullName: item.fullName,
                                  decision: "rejected",
                                });
                                setReason("");
                              }}
                              disabled={reviewKyc.isPending}
                            >
                              <XCircle size={12} /> Reject
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
              {modal.decision === "approved" ? "Approve KYC" : "Reject KYC"}
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
              {modal.fullName}
            </p>

            <div className="mt-4">
              <label className="label">
                {modal.decision === "rejected"
                  ? "Rejection Reason (required)"
                  : "Approval Note (optional)"}
              </label>
              <textarea
                className="input min-h-28 resize-y"
                placeholder={
                  modal.decision === "rejected"
                    ? "State why this submission was rejected"
                    : "Optional review note"
                }
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={300}
              />
            </div>

            {modal.decision === "rejected" ? (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-3 flex items-center gap-1.5">
                <AlertTriangle size={12} />
                Rejections require a clear reason of at least 5 characters.
              </p>
            ) : null}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={closeModal}
                disabled={reviewKyc.isPending}
              >
                Cancel
              </button>
              <button
                type="button"
                className={
                  modal.decision === "approved" ? "btn-primary" : "btn-danger"
                }
                onClick={submitDecision}
                disabled={
                  reviewKyc.isPending ||
                  (modal.decision === "rejected" && reason.trim().length < 5)
                }
              >
                {reviewKyc.isPending ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner size={13} className="text-white" /> Saving...
                  </span>
                ) : modal.decision === "approved" ? (
                  "Approve"
                ) : (
                  "Reject"
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
