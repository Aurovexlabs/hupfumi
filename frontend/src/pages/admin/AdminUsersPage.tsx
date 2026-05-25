import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import {
  useAdminAuditLogs,
  useAdminDeleteUser,
  useAdminUsers,
} from "@/hooks/useApi";
import api from "@/lib/api";
import { cn, formatDate, formatRelativeTime } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [deleteModal, setDeleteModal] = useState<any>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const deleteUser = useAdminDeleteUser();

  const params: any = { page, limit: 20 };
  if (search) params.search = search;
  if (kycFilter) params.kycStatus = kycFilter;
  if (statusFilter) params.accountStatus = statusFilter;

  const { data, isLoading } = useAdminUsers(params);
  const { data: auditData } = useAdminAuditLogs({ limit: 8 });
  const users: any[] = (data as any)?.data?.data ?? (data as any)?.data ?? [];
  const pagination =
    (data as any)?.data?.pagination ?? (data as any)?.pagination;
  const auditLogs: any[] =
    (auditData as any)?.data?.data ?? (auditData as any)?.data ?? [];

  const toggleStatus = async (user: any) => {
    const next = user.accountStatus === "active" ? "suspended" : "active";
    try {
      await api.patch(`/admin/users/${user._id}/status`, {
        accountStatus: next,
      });
      toast.success(`User ${next}`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch {}
  };

  const handleDeleteUser = async () => {
    if (!deleteModal) return;

    if (deleteReason.trim().length < 5) {
      toast.error("Provide a reason (min 5 characters).");
      return;
    }

    await deleteUser.mutateAsync({
      userId: deleteModal._id,
      reason: deleteReason.trim(),
    });

    setDeleteReason("");
    setDeleteModal(null);
  };

  const kycColor: Record<string, string> = {
    not_submitted: "badge-gray",
    pending: "badge-amber",
    approved: "badge-green",
    rejected: "badge-red",
  };
  const statColor: Record<string, string> = {
    active: "badge-green",
    suspended: "badge-amber",
    banned: "badge-red",
    pending: "badge-gray",
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users size={20} className="text-brand-orange" />
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white">
              User Management
            </h1>
          </div>
          <p className="text-text-secondary dark:text-slate-400 text-sm">
            {pagination?.total ?? 0} total users
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-8 w-56 text-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <select
          className="input w-44 text-sm"
          value={kycFilter}
          onChange={(e) => {
            setKycFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All KYC statuses</option>
          {["not_submitted", "pending", "approved", "rejected"].map((s) => (
            <option key={s} value={s}>
              {s.replace("_", " ")}
            </option>
          ))}
        </select>
        <select
          className="input w-44 text-sm"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All account statuses</option>
          {["active", "pending", "suspended", "banned"].map((s) => (
            <option key={s} value={s}>
              {s}
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
                    "User",
                    "Email",
                    "Type",
                    "Account",
                    "KYC",
                    "Joined",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 text-xs font-semibold text-text-secondary dark:text-slate-400 uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-text-tertiary dark:text-slate-500"
                    >
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((u: any) => (
                    <tr
                      key={u._id}
                      className="border-b border-surface-100 dark:border-dark-border hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors last:border-0"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.avatar ? (
                            <img
                              src={u.avatar}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                              {u.fullName?.[0] ?? "?"}
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-text-primary dark:text-white">
                              {u.fullName}
                            </p>
                            <p className="text-xs text-text-tertiary dark:text-slate-500">
                              @{u.username}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-secondary dark:text-slate-400 text-xs">
                        {u.email}
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-gray capitalize">
                          {u.profileType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "badge capitalize",
                            statColor[u.accountStatus] ?? "badge-gray",
                          )}
                        >
                          {u.accountStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "badge capitalize",
                            kycColor[u.kycStatus ?? "not_submitted"] ??
                              "badge-gray",
                          )}
                        >
                          {(u.kycStatus ?? "not_submitted").replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-text-tertiary dark:text-slate-500">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleStatus(u)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-lg font-medium transition-colors",
                              u.accountStatus === "active"
                                ? "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100"
                                : "bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 hover:bg-green-100",
                            )}
                          >
                            {u.accountStatus === "active"
                              ? "Suspend"
                              : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteModal(u);
                              setDeleteReason("");
                            }}
                            className="text-xs px-2.5 py-1 rounded-lg font-medium bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-100 dark:border-dark-border">
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                Page {pagination.page} of {pagination.pages} ·{" "}
                {pagination.total} total
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary text-xs py-1.5 px-3"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary text-xs py-1.5 px-3"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent audit activity */}
      <div className="card p-5 mt-6">
        <h2 className="font-semibold text-text-primary dark:text-white mb-3">
          Recent Admin Audit Log
        </h2>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-text-tertiary dark:text-slate-500">
            No audit entries yet.
          </p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((entry: any) => (
              <div
                key={entry._id}
                className="p-3 rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text-primary dark:text-white">
                    {(entry.action || "").replace(/_/g, " ")}
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

      {/* Delete user modal */}
      {deleteModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteModal(null);
          }}
        >
          <div className="bg-surface-0 dark:bg-dark-card rounded-2xl w-full max-w-md p-6 animate-slide-up border border-surface-200 dark:border-dark-border">
            <h2 className="font-semibold text-text-primary dark:text-white mb-2">
              Delete user account
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
              This permanently deletes <strong>{deleteModal.fullName}</strong>{" "}
              and related account data. This cannot be undone.
            </p>
            <label className="label">Reason (required)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Reason for deletion"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => {
                  setDeleteModal(null);
                  setDeleteReason("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger flex-1 justify-center"
                onClick={handleDeleteUser}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? (
                  <Spinner size={14} className="text-white" />
                ) : (
                  "Delete User"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
