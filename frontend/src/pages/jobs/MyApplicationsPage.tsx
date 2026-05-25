import { Spinner } from "@/components/common/LoadingScreen";
import { useMyApplications } from "@/hooks/useApi";
import { cn, formatCurrency, formatRelativeTime } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { CheckCircle, ChevronRight, Clock, Inbox, XCircle } from "lucide-react";

const CFG: Record<string, { color: string; icon: any; label: string }> = {
  pending: { color: "badge-gray", icon: Clock, label: "Pending Review" },
  reviewed: { color: "badge-blue", icon: Clock, label: "Under Review" },
  shortlisted: { color: "badge-amber", icon: Clock, label: "Shortlisted" },
  accepted: { color: "badge-green", icon: CheckCircle, label: "Accepted" },
  rejected: { color: "badge-red", icon: XCircle, label: "Not Selected" },
};

export default function MyApplicationsPage() {
  const { data, isLoading } = useMyApplications();
  const apps: any[] = (data as any)?.data ?? [];
  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="mb-8">
        <h1 className="section-title">My Applications</h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
          {apps.length} submitted
        </p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : apps.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-surface-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Inbox
              size={28}
              className="text-text-tertiary dark:text-slate-500"
            />
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No applications yet
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            Browse available jobs and submit your first application.
          </p>
          <Link to="/jobs" className="btn-primary">
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app: any) => {
            const cfg = CFG[app.status] ?? CFG.pending;
            const Icon = cfg.icon;
            return (
              <div
                key={app._id}
                className="card p-5 hover:border-brand-orange/30 transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    {app.job?.slug ? (
                      <Link
                        to="/jobs/$slug"
                        params={{ slug: app.job.slug }}
                        className="font-semibold text-text-primary dark:text-white hover:text-brand-orange transition-colors line-clamp-1 block mb-1"
                      >
                        {app.job?.title ?? "Job listing"}
                      </Link>
                    ) : (
                      <span className="font-semibold text-text-primary dark:text-white line-clamp-1 block mb-1">
                        {app.job?.title ?? "Job listing"}
                      </span>
                    )}
                    <p className="text-xs text-text-tertiary dark:text-slate-500">
                      Applied {formatRelativeTime(app.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Icon
                      size={13}
                      className={
                        app.status === "accepted"
                          ? "text-brand-green"
                          : app.status === "rejected"
                            ? "text-red-500"
                            : "text-text-tertiary"
                      }
                    />
                    <span className={cn("badge", cfg.color)}>{cfg.label}</span>
                  </div>
                </div>
                <p className="text-sm text-text-secondary dark:text-slate-300 mt-3 line-clamp-2 leading-relaxed">
                  {app.coverLetter}
                </p>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-surface-100 dark:border-dark-border">
                  <div className="flex items-center gap-4 text-xs text-text-tertiary dark:text-slate-500">
                    <span>
                      Proposed:{" "}
                      <strong className="text-text-primary dark:text-white">
                        {formatCurrency(app.proposedBudget)}
                      </strong>
                    </span>
                    <span>
                      Timeline:{" "}
                      <strong className="text-text-primary dark:text-white">
                        {app.proposedTimeline}
                      </strong>
                    </span>
                  </div>
                  {app.job?.slug ? (
                    <Link
                      to="/jobs/$slug"
                      params={{ slug: app.job.slug }}
                      className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1"
                    >
                      View Job <ChevronRight size={11} />
                    </Link>
                  ) : (
                    <span className="btn-ghost text-xs py-1.5 px-3 flex items-center gap-1 opacity-50 cursor-not-allowed">
                      View Job <ChevronRight size={11} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
