import LoadingScreen from "@/components/common/LoadingScreen";
import { useService } from "@/hooks/useApi";
import { cn, formatCurrency, getInitials } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  ChevronRight,
  RefreshCw,
  Shield,
  Star,
} from "lucide-react";

function useGigId() {
  const parts = window.location.pathname.split("/");
  return parts[parts.indexOf("gig") + 1] ?? "";
}

export default function GigPage() {
  const id = useGigId();
  // Try by slug first
  const { data: service, isLoading } = useService(id);

  if (isLoading) return <LoadingScreen />;
  if (!service)
    return (
      <div className="page-container py-20 text-center">
        <p className="text-text-secondary dark:text-slate-400 mb-4">
          Service not found.
        </p>
        <Link to="/services" className="btn-secondary">
          Browse Services
        </Link>
      </div>
    );

  const s = service as any;
  const lowestPrice = s.pricing?.[0]?.price ?? 0;

  return (
    <div className="page-container py-8 animate-fade-in max-w-2xl">
      <Link
        to="/services"
        className="btn-ghost mb-5 flex items-center gap-2 text-sm"
      >
        <ArrowLeft size={14} /> Back to Services
      </Link>

      <div className="card overflow-hidden">
        {/* Gallery hero */}
        {s.gallery?.[0]?.url && (
          <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
            <img
              src={s.gallery[0].url}
              alt={s.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 space-y-6">
          {/* Title + seller */}
          <div>
            <span className="badge badge-blue mb-3 inline-block">
              {s.category}
            </span>
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white mb-4">
              {s.title}
            </h1>
            {s.seller?.username ? (
              <Link
                to="/profile/$username"
                params={{ username: s.seller.username }}
                className="flex items-center gap-3 group w-fit"
              >
                {s.seller?.avatar ? (
                  <img
                    src={s.seller.avatar}
                    alt=""
                    className="avatar w-12 h-12"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-navy text-white font-bold flex items-center justify-center">
                    {getInitials(s.seller?.fullName ?? "")}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-text-primary dark:text-white group-hover:text-brand-orange transition-colors">
                    {s.seller?.fullName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary dark:text-slate-500">
                    {s.seller?.averageRating > 0 && (
                      <>
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        {s.seller.averageRating.toFixed(1)}
                      </>
                    )}
                    {s.seller?.isVerifiedBadge && (
                      <span className="badge badge-green">Verified</span>
                    )}
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        s.seller?.availabilityStatus === "available"
                          ? "bg-brand-green"
                          : "bg-surface-300",
                      )}
                    />
                    <span className="capitalize">
                      {s.seller?.availabilityStatus ?? "offline"}
                    </span>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 w-fit">
                {s.seller?.avatar ? (
                  <img
                    src={s.seller.avatar}
                    alt=""
                    className="avatar w-12 h-12"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-brand-navy text-white font-bold flex items-center justify-center">
                    {getInitials(s.seller?.fullName ?? "")}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-text-primary dark:text-white">
                    {s.seller?.fullName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-text-tertiary dark:text-slate-500">
                    {s.seller?.averageRating > 0 && (
                      <>
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        {s.seller.averageRating.toFixed(1)}
                      </>
                    )}
                    {s.seller?.isVerifiedBadge && (
                      <span className="badge badge-green">Verified</span>
                    )}
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full",
                        s.seller?.availabilityStatus === "available"
                          ? "bg-brand-green"
                          : "bg-surface-300",
                      )}
                    />
                    <span className="capitalize">
                      {s.seller?.availabilityStatus ?? "offline"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing quick view */}
          <div className="bg-surface-50 dark:bg-dark-hover rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-2xl font-display font-bold text-brand-orange">
                  From {formatCurrency(lowestPrice)}
                </p>
                <p className="text-sm text-text-secondary dark:text-slate-400 mt-0.5">
                  {s.pricing?.[0]?.deliveryDays} day delivery ·{" "}
                  {s.pricing?.[0]?.revisions ?? 1} revision
                  {s.pricing?.[0]?.revisions !== 1 ? "s" : ""}
                </p>
              </div>
              <Link
                to="/services/$slug"
                params={{ slug: s.slug }}
                className="btn-primary"
              >
                Order Now <ChevronRight size={14} />
              </Link>
            </div>
            {s.pricing?.length > 1 && (
              <div className="flex gap-2">
                {s.pricing.map((t: any) => (
                  <div
                    key={t.name}
                    className="flex-1 p-3 bg-surface-0 dark:bg-dark-card rounded-xl text-center border border-surface-200 dark:border-dark-border"
                  >
                    <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 capitalize">
                      {t.name}
                    </p>
                    <p className="font-bold text-text-primary dark:text-white mt-1">
                      {formatCurrency(t.price)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h2 className="font-semibold text-text-primary dark:text-white mb-3">
              About this service
            </h2>
            <p className="text-text-secondary dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap line-clamp-6">
              {s.description}
            </p>
            <Link
              to="/services/$slug"
              params={{ slug: s.slug }}
              className="text-sm text-brand-orange hover:underline font-medium mt-2 inline-block"
            >
              Read full description →
            </Link>
          </div>

          {/* Trust */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-surface-100 dark:border-dark-border">
            {[
              { I: Shield, t: "Escrow-protected" },
              { I: CheckCircle, t: "Verified seller" },
              { I: RefreshCw, t: "Revision included" },
            ].map(({ I, t }) => (
              <div
                key={t}
                className="flex items-center gap-1.5 text-xs text-text-secondary dark:text-slate-400"
              >
                <I size={12} className="text-brand-green" />
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
