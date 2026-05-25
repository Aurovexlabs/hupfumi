import { Textarea } from "@/components/common/FormComponents";
import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import {
  useApplyToJob,
  useCheckSaved,
  useJob,
  useJobApplications,
  useStartConversation,
  useToggleSave,
} from "@/hooks/useApi";
import {
  getListingNote,
  hydrateListingNotesFromCloud,
  saveListingNote,
} from "@/lib/listingNotes";
import { calculateSkillMatch } from "@/lib/matching";
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
  trackRecentlyViewed,
} from "@/lib/recentlyViewed";
import {
  cn,
  formatCurrency,
  formatDate,
  formatRelativeTime,
  getInitials,
  shareOrCopyLink,
} from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link, useParams } from "@tanstack/react-router";
import {
  Bookmark,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  MapPin,
  Share2,
  Star,
  Target,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function JobDetailPage() {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const { data: job, isLoading } = useJob(slug);
  const startConversation = useStartConversation();
  const toggleSave = useToggleSave();
  const { user, isAuthenticated } = useAuthStore();
  const [showApply, setShowApply] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [recentlyViewedJobs, setRecentlyViewedJobs] = useState<
    RecentlyViewedItem[]
  >([]);

  const j = (job as any) ?? null;
  const jobId = j?._id ? String(j._id) : "";
  const { data: isSaved = false } = useCheckSaved("job", jobId);
  const isOwner = user?._id === j?.employer?._id;
  const match = isAuthenticated
    ? calculateSkillMatch(j?.skills, user?.skills)
    : null;

  useEffect(() => {
    if (!j?._id || !j?.slug) return;

    trackRecentlyViewed("job", {
      id: String(j._id),
      slug: String(j.slug),
      title: String(j.title || "Untitled job"),
      subtitle: String(j.category || j.jobType || "Job opportunity"),
      price: Number(j.budget?.min || 0),
    });

    setRecentlyViewedJobs(getRecentlyViewed("job", String(j._id), 4));
  }, [j?._id, j?.slug, j?.title, j?.category, j?.jobType, j?.budget?.min]);

  useEffect(() => {
    let isMounted = true;
    setPrivateNote(jobId ? getListingNote("job", jobId) : "");

    const syncCloudNote = async () => {
      if (!jobId || !isAuthenticated) return;

      await hydrateListingNotesFromCloud();
      if (isMounted) {
        setPrivateNote(getListingNote("job", jobId));
      }
    };

    void syncCloudNote();

    return () => {
      isMounted = false;
    };
  }, [jobId, isAuthenticated]);

  useEffect(() => {
    if (!jobId) return;
    const timer = window.setTimeout(() => {
      saveListingNote("job", jobId, privateNote);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [jobId, privateNote]);

  if (isLoading) return <LoadingScreen />;
  if (!j)
    return (
      <div className="page-container py-20 text-center text-text-secondary dark:text-slate-400">
        Job not found.
      </div>
    );

  const contactEmployer = async () => {
    if (!j?.employer?._id) return;
    const convo = await startConversation.mutateAsync(j.employer._id);
    if (convo?._id) {
      window.location.assign(
        `/messages?conversation=${encodeURIComponent(String(convo._id))}`,
      );
    }
  };

  const handleShareJob = async () => {
    const outcome = await shareOrCopyLink({
      title: j.title,
      text: "Check out this job on Hupfumi",
    });

    if (outcome === "copied") toast.success("Job link copied");
    if (outcome === "failed") toast.error("Unable to share this job");
  };

  const handleToggleSave = async () => {
    if (!jobId) return;
    try {
      await toggleSave.mutateAsync({ refType: "job", refId: jobId });
      toast.success(isSaved ? "Removed from saved jobs" : "Saved job");
    } catch {
      toast.error("Unable to update saved jobs");
    }
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0 space-y-5">
          <div className="card p-6">
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className={cn(
                  "badge",
                  j.jobType === "fixed" ? "badge-blue" : "badge-orange",
                )}
              >
                {j.jobType}
              </span>
              <span
                className={cn(
                  "badge",
                  j.status === "open" ? "badge-green" : "badge-gray",
                )}
              >
                {j.status}
              </span>
              {j.featured && (
                <span className="badge badge-amber">Featured</span>
              )}
            </div>
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white mb-4">
              {j.title}
            </h1>
            <div className="flex flex-wrap gap-4 text-sm text-text-secondary dark:text-slate-400">
              {j.location?.city && (
                <span className="flex items-center gap-1.5">
                  <MapPin size={13} />
                  {j.location.city}
                </span>
              )}
              {j.deadline && (
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} />
                  Deadline: {formatDate(j.deadline)}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {formatRelativeTime(j.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={13} />
                {j.applicantsCount ?? 0} applicants
              </span>
            </div>
          </div>

          {match && !isOwner && (
            <div className="card p-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                  <Target size={16} className="text-brand-orange" />
                  Your Match Insights
                </h2>
                <span
                  className={cn(
                    "badge",
                    match.score >= 70
                      ? "badge-green"
                      : match.score >= 40
                        ? "badge-amber"
                        : "badge-gray",
                  )}
                >
                  {match.score}% {match.label}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-100 dark:bg-dark-hover overflow-hidden mb-3">
                <div
                  className={cn(
                    "h-full rounded-full",
                    match.score >= 70
                      ? "bg-brand-green"
                      : match.score >= 40
                        ? "bg-amber-500"
                        : "bg-slate-400",
                  )}
                  style={{ width: `${match.score}%` }}
                />
              </div>
              <p className="text-xs text-text-tertiary dark:text-slate-500 mb-3">
                {match.matched.length} of {match.totalRequired} required skills
                match your profile.
              </p>
              {match.matched.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs font-semibold text-brand-green mb-1.5">
                    Matched skills
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.matched.map((skill) => (
                      <span
                        key={skill}
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 text-xs px-2 py-0.5 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {match.missing.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-text-tertiary dark:text-slate-400 mb-1.5">
                    Skills to strengthen
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {match.missing.slice(0, 6).map((skill) => (
                      <span
                        key={skill}
                        className="bg-surface-100 dark:bg-dark-card text-text-secondary dark:text-slate-400 text-xs px-2 py-0.5 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-semibold text-text-primary dark:text-white mb-4">
              Job Description
            </h2>
            <p className="text-text-secondary dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {j.description}
            </p>
          </div>
          {j.skills?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-text-primary dark:text-white mb-3">
                Required Skills
              </h2>
              <div className="flex flex-wrap gap-2">
                {j.skills.map((s: string) => (
                  <span
                    key={s}
                    className="bg-brand-navy/5 dark:bg-brand-navy/30 text-brand-navy dark:text-blue-300 text-sm px-3 py-1 rounded-full font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-brand-orange" />
                Private Hiring Notes
              </h2>
              {privateNote.trim() ? (
                <button
                  type="button"
                  className="btn-ghost text-xs py-1 px-2"
                  onClick={() => setPrivateNote("")}
                >
                  Clear
                </button>
              ) : null}
            </div>
            <textarea
              className="input min-h-28 resize-y"
              placeholder="Capture your thoughts, screening criteria, and follow-up questions. This note stays on your device only."
              value={privateNote}
              onChange={(event) => setPrivateNote(event.target.value)}
            />
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2">
              Auto-saved locally and synced to your account when signed in.
            </p>
          </div>

          {isOwner && <JobApplications jobId={j._id} />}
        </div>
        <aside className="lg:w-80 shrink-0 space-y-5">
          <div className="card p-6 sticky top-20">
            <p className="text-xs text-text-tertiary dark:text-slate-500 uppercase tracking-wide font-semibold mb-1">
              Budget
            </p>
            <p className="font-display font-bold text-2xl text-brand-navy dark:text-white">
              {formatCurrency(j.budget?.min)} – {formatCurrency(j.budget?.max)}
            </p>
            <p className="text-sm text-text-tertiary dark:text-slate-500 mb-5">
              {j.jobType === "hourly" ? "per hour" : "fixed price"}
            </p>
            {!isOwner && isAuthenticated && j.status === "open" ? (
              <button
                type="button"
                onClick={() => setShowApply(true)}
                className="btn-primary w-full"
              >
                Apply Now <ChevronRight size={14} />
              </button>
            ) : !isAuthenticated ? (
              <Link
                to="/login"
                className="btn-primary w-full flex justify-center"
              >
                Log in to apply
              </Link>
            ) : isOwner ? (
              <div className="p-3 bg-brand-navy/5 dark:bg-dark-hover rounded-xl text-sm text-brand-navy dark:text-white font-medium text-center">
                You posted this job
              </div>
            ) : null}

            {!isOwner && isAuthenticated && (
              <button
                type="button"
                onClick={contactEmployer}
                className="btn-secondary w-full mt-2"
                disabled={startConversation.isPending}
              >
                Message Employer
              </button>
            )}

            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={handleShareJob}
                className="btn-secondary w-full"
              >
                <Share2 size={14} /> Share
              </button>
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={handleToggleSave}
                  className="btn-ghost w-full"
                  disabled={toggleSave.isPending}
                >
                  <Bookmark size={14} /> {isSaved ? "Saved" : "Save"}
                </button>
              ) : (
                <Link to="/login" className="btn-ghost w-full justify-center">
                  <Bookmark size={14} /> Save
                </Link>
              )}
            </div>
          </div>
          {j.employer && (
            <div className="card p-5">
              <p className="text-xs text-text-tertiary dark:text-slate-500 uppercase tracking-wide font-semibold mb-4">
                Posted by
              </p>
              <Link
                to="/profile/$username"
                params={{ username: j.employer.username }}
                className="flex items-center gap-3 group"
              >
                {j.employer.avatar ? (
                  <img
                    src={j.employer.avatar}
                    alt=""
                    className="avatar w-12 h-12"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-navy text-white font-bold flex items-center justify-center">
                    {getInitials(j.employer.fullName)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-text-primary dark:text-white group-hover:text-brand-orange transition-colors">
                    {j.employer.fullName}
                  </p>
                  {j.employer.averageRating > 0 && (
                    <div className="flex items-center gap-1 text-xs text-text-tertiary dark:text-slate-500">
                      <Star
                        size={11}
                        className="text-yellow-400 fill-yellow-400"
                      />
                      {j.employer.averageRating.toFixed(1)}
                    </div>
                  )}
                </div>
              </Link>
            </div>
          )}
        </aside>
      </div>

      {recentlyViewedJobs.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-text-primary dark:text-white mb-4">
            Recently Viewed Jobs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentlyViewedJobs.map((item) => (
              <Link
                key={item.id}
                to="/jobs/$slug"
                params={{ slug: item.slug }}
                className="card p-4 hover:border-brand-orange/30 transition-all"
              >
                <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2">
                  {item.title}
                </p>
                <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1 line-clamp-1">
                  {item.subtitle || "Job opportunity"}
                </p>
                {item.price ? (
                  <p className="text-xs text-brand-orange font-semibold mt-1.5">
                    From {formatCurrency(item.price)}
                  </p>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      )}

      {showApply && (
        <ApplyModal jobId={j._id} onClose={() => setShowApply(false)} />
      )}
    </div>
  );
}

function JobApplications({ jobId }: { jobId: string }) {
  const { data: apps = [], isLoading } = useJobApplications(jobId);
  if (isLoading)
    return (
      <div className="card p-6">
        <Spinner size={20} className="text-brand-orange mx-auto" />
      </div>
    );
  const list = apps as any[];
  return (
    <div className="card p-6">
      <h2 className="font-semibold text-text-primary dark:text-white mb-5">
        Applications ({list.length})
      </h2>
      {list.length === 0 ? (
        <p className="text-text-tertiary dark:text-slate-500 text-sm text-center py-6">
          No applications yet
        </p>
      ) : (
        <div className="space-y-4">
          {list.map((app: any) => (
            <div
              key={app._id}
              className="flex items-start gap-3 p-4 border border-surface-100 dark:border-dark-border rounded-xl"
            >
              <div className="w-10 h-10 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center shrink-0">
                {getInitials(app.applicant?.fullName ?? "U")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  {app.applicant?.username ? (
                    <Link
                      to="/profile/$username"
                      params={{ username: app.applicant.username }}
                      className="font-semibold text-sm text-text-primary dark:text-white hover:text-brand-orange"
                    >
                      {app.applicant?.fullName}
                    </Link>
                  ) : (
                    <span className="font-semibold text-sm text-text-primary dark:text-white">
                      {app.applicant?.fullName}
                    </span>
                  )}
                  <span
                    className={cn(
                      "badge",
                      app.status === "accepted"
                        ? "badge-green"
                        : app.status === "rejected"
                          ? "badge-red"
                          : "badge-gray",
                    )}
                  >
                    {app.status}
                  </span>
                </div>
                <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                  {formatCurrency(app.proposedBudget)} · {app.proposedTimeline}
                </p>
                <p className="text-sm text-text-secondary dark:text-slate-300 mt-2 line-clamp-2">
                  {app.coverLetter}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ApplyModal({
  jobId,
  onClose,
}: {
  jobId: string;
  onClose: () => void;
}) {
  const apply = useApplyToJob(jobId);
  const [form, setForm] = useState({
    coverLetter: "",
    proposedBudget: "",
    proposedTimeline: "",
  });
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const proposedBudget = Number(form.proposedBudget);
    if (!Number.isFinite(proposedBudget) || proposedBudget <= 0) {
      return;
    }

    try {
      await apply.mutateAsync({
        coverLetter: form.coverLetter,
        proposedBudget,
        proposedTimeline: form.proposedTimeline,
      });
      onClose();
    } catch {}
  };
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-0 dark:bg-dark-card rounded-2xl w-full max-w-lg p-6 animate-slide-up border border-surface-200 dark:border-dark-border">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display font-bold text-xl text-brand-navy dark:text-white">
            Submit Application
          </h2>
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          <Textarea
            label="Cover Letter"
            placeholder="Explain why you are the best fit…"
            value={form.coverLetter}
            onChange={(e) => setForm({ ...form, coverLetter: e.target.value })}
            rows={5}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Proposed Budget ($)</label>
              <input
                type="number"
                className="input"
                placeholder="500"
                min="1"
                required
                value={form.proposedBudget}
                onChange={(e) =>
                  setForm({ ...form, proposedBudget: e.target.value })
                }
              />
            </div>
            <div>
              <label className="label">Timeline</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. 2 weeks"
                required
                value={form.proposedTimeline}
                onChange={(e) =>
                  setForm({ ...form, proposedTimeline: e.target.value })
                }
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={apply.isPending}
            >
              {apply.isPending ? (
                <>
                  <Spinner size={14} className="text-white" />
                  Submitting…
                </>
              ) : (
                "Submit Application"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
