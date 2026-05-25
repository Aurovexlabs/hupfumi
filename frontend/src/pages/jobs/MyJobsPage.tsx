import { Spinner } from "@/components/common/LoadingScreen";
import { useDeleteJob, useMyJobs } from "@/hooks/useApi";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Briefcase,
  ChevronRight,
  Eye,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";

export default function MyJobsPage() {
  const { data, isLoading, refetch } = useMyJobs();
  const deleteJob = useDeleteJob();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const jobs: any[] = (data as any)?.data ?? [];

  const handleDelete = async (id: string) => {
    await deleteJob.mutateAsync(id);
    setConfirmDelete(null);
    refetch();
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">My Jobs</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {jobs.length} posted
          </p>
        </div>
        <Link to="/jobs/new" className="btn-primary">
          <Plus size={14} />
          Post Job
        </Link>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : jobs.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase size={28} className="text-blue-600" />
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No jobs posted yet
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            Post your first job to start receiving applications.
          </p>
          <Link to="/jobs/new" className="btn-primary">
            Post your first job
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job: any) => (
            <div
              key={job._id}
              className="card p-5 hover:border-brand-orange/30 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                      className={cn(
                        "badge",
                        job.status === "open"
                          ? "badge-green"
                          : job.status === "in_progress"
                            ? "badge-blue"
                            : "badge-gray",
                      )}
                    >
                      {job.status?.replace(/_/g, " ")}
                    </span>
                    <span className="badge badge-blue capitalize">
                      {job.jobType}
                    </span>
                  </div>
                  <Link
                    to="/jobs/$slug"
                    params={{ slug: job.slug }}
                    className="font-semibold text-text-primary dark:text-white hover:text-brand-orange transition-colors line-clamp-1 block mb-1"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-text-tertiary dark:text-slate-500">
                    {job.category} · {formatRelativeTime(job.createdAt)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-brand-navy dark:text-white text-sm">
                    {formatCurrency(job.budget?.min)}–
                    {formatCurrency(job.budget?.max)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-100 dark:border-dark-border">
                <div className="flex items-center gap-4 text-xs text-text-tertiary dark:text-slate-500">
                  <span className="flex items-center gap-1">
                    <Users size={11} />
                    {job.applicantsCount ?? 0} applicants
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye size={11} />
                    {job.views ?? 0} views
                  </span>
                </div>
                <Link
                  to="/jobs/$slug"
                  params={{ slug: job.slug }}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  Manage <ChevronRight size={11} />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    window.location.assign(
                      `/jobs/new?edit=${encodeURIComponent(String(job._id))}`,
                    )
                  }
                  className="btn-ghost text-xs py-1.5 px-3"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(job._id)}
                  className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 text-red-500 hover:text-red-600"
                >
                  <Trash2 size={11} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDelete(null);
          }}
        >
          <div className="bg-surface-0 dark:bg-dark-card rounded-2xl w-full max-w-sm p-6 animate-slide-up border border-surface-200 dark:border-dark-border">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-text-primary dark:text-white text-center mb-2">
              Delete job?
            </h3>
            <p className="text-text-secondary dark:text-slate-400 text-sm text-center mb-5">
              This action is permanent and will remove the job and applications.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDelete(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleteJob.isPending}
                className="btn-danger flex-1 justify-center"
              >
                {deleteJob.isPending ? (
                  <Spinner size={14} className="text-white" />
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
