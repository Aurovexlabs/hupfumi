import LoadingScreen, { Spinner } from "@/components/common/LoadingScreen";
import ReviewSection from "@/components/common/ReviewSection";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useCheckSaved,
  useMyWallet,
  usePlaceServiceOrder,
  useRelatedServices,
  useService,
  useStartConversation,
  useToggleSave,
} from "@/hooks/useApi";
import {
  getListingNote,
  hydrateListingNotesFromCloud,
  saveListingNote,
} from "@/lib/listingNotes";
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
  trackRecentlyViewed,
} from "@/lib/recentlyViewed";
import {
  cn,
  formatCurrency,
  formatDate,
  getInitials,
  shareOrCopyLink,
} from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  FileText,
  RefreshCw,
  Settings,
  Share2,
  Shield,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function useSlug() {
  const parts = window.location.pathname.split("/");
  return parts[parts.indexOf("services") + 1] ?? "";
}

// ── Related Services ──────────────────────────────────────────
function RelatedServices({
  category,
  excludeId,
}: {
  category: string;
  excludeId: string;
}) {
  const { data: related = [] } = useRelatedServices(category, excludeId);
  if (!(related as any[]).length) return null;
  return (
    <div>
      <h2 className="font-semibold text-text-primary dark:text-white mb-4">
        Similar Services
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {(related as any[]).map((s: any) => (
          <Link
            key={s._id}
            to="/services/$slug"
            params={{ slug: s.slug }}
            className="card overflow-hidden group hover:border-brand-orange/30 transition-all"
          >
            <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
              {s.gallery?.[0]?.url ? (
                <img
                  src={s.gallery[0].url}
                  alt={s.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Settings
                    size={20}
                    className="text-text-disabled dark:text-slate-600"
                  />
                </div>
              )}
            </div>
            <div className="p-3">
              <p className="text-xs font-medium text-text-primary dark:text-white line-clamp-2 group-hover:text-brand-orange transition-colors">
                {s.title}
              </p>
              <p className="text-xs text-brand-orange font-bold mt-1">
                From {formatCurrency(s.pricing?.[0]?.price ?? 0)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Order Modal ───────────────────────────────────────────────
function OrderModal({
  open,
  onClose,
  service,
  tier,
  wallet,
  onOrder,
  isPending,
}: {
  open: boolean;
  onClose: () => void;
  service: any;
  tier: any;
  wallet: any;
  onOrder: (reqs: string, method: string) => void;
  isPending: boolean;
}) {
  const [requirements, setRequirements] = useState("");
  const [payMethod, setPayMethod] = useState<"wallet" | "paynow" | "ecocash">(
    "wallet",
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-surface-0 dark:bg-dark-card border-surface-200 dark:border-dark-border">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl text-brand-navy dark:text-white">
            Place Order
          </DialogTitle>
        </DialogHeader>
        <div className="p-3 bg-surface-50 dark:bg-dark-hover rounded-xl mb-2">
          <p className="font-semibold text-sm text-text-primary dark:text-white">
            {service?.title}
          </p>
          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5 capitalize">
            {tier?.name} · {formatCurrency(tier?.price)} · {tier?.deliveryDays}{" "}
            days
          </p>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">Your Requirements</label>
            <textarea
              className="input min-h-25 resize-y"
              placeholder="Describe exactly what you need…"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["wallet", "Wallet"],
                ["paynow", "Paynow"],
                ["ecocash", "EcoCash"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPayMethod(v as any)}
                  className={cn(
                    "p-2.5 rounded-xl border-2 text-xs font-medium transition-colors",
                    payMethod === v
                      ? "border-brand-orange bg-orange-50 dark:bg-orange-950/20 text-brand-orange"
                      : "border-surface-200 dark:border-dark-border text-text-secondary dark:text-slate-300",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
            {payMethod === "wallet" && wallet && (
              <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                Balance: {formatCurrency(wallet.balance)}
                {wallet.balance < tier?.price && (
                  <span className="text-red-500 ml-1">(insufficient)</span>
                )}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-3 mt-2">
          <button
            type="button"
            className="btn-secondary flex-1"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary flex-1"
            onClick={() => onOrder(requirements, payMethod)}
            disabled={isPending}
          >
            {isPending ? (
              <Spinner size={14} className="text-white" />
            ) : (
              `Pay ${formatCurrency(tier?.price)}`
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ServiceDetailPage() {
  const slug = useSlug();
  const { data: service, isLoading } = useService(slug);
  const { user, isAuthenticated } = useAuthStore();
  const { data: wallet } = useMyWallet();
  const placeOrder = usePlaceServiceOrder();
  const startConversation = useStartConversation();
  const toggleSave = useToggleSave();
  const [selectedTier, setSelectedTier] = useState(0);
  const [showOrder, setShowOrder] = useState(false);
  const [privateNote, setPrivateNote] = useState("");
  const [recentlyViewedServices, setRecentlyViewedServices] = useState<
    RecentlyViewedItem[]
  >([]);

  const s = (service as any) ?? null;
  const serviceId = s?._id ? String(s._id) : "";
  const { data: isSaved = false } = useCheckSaved("service", serviceId);
  const tier = s?.pricing?.[selectedTier];
  const isOwner = user?._id === s?.seller?._id;
  const w = wallet as any;
  const deliveryDays = Math.max(0, Number(tier?.deliveryDays || 0));
  const now = new Date();
  const progressCheckDate = new Date(
    now.getTime() +
      Math.max(1, Math.floor(Math.max(1, deliveryDays) / 2)) *
        24 *
        60 *
        60 *
        1000,
  );
  const estimatedDeliveryDate = new Date(
    now.getTime() + deliveryDays * 24 * 60 * 60 * 1000,
  );

  useEffect(() => {
    if (!s?._id || !s?.slug) return;

    trackRecentlyViewed("service", {
      id: String(s._id),
      slug: String(s.slug),
      title: String(s.title || "Untitled service"),
      subtitle: String(s.category || ""),
      price: Number(s.pricing?.[0]?.price || 0),
      imageUrl: s.gallery?.[0]?.url,
    });

    setRecentlyViewedServices(getRecentlyViewed("service", String(s._id), 4));
  }, [s?._id, s?.slug, s?.title, s?.category, s?.pricing, s?.gallery]);

  useEffect(() => {
    let isMounted = true;
    setPrivateNote(serviceId ? getListingNote("service", serviceId) : "");

    const syncCloudNote = async () => {
      if (!serviceId || !isAuthenticated) return;

      await hydrateListingNotesFromCloud();
      if (isMounted) {
        setPrivateNote(getListingNote("service", serviceId));
      }
    };

    void syncCloudNote();

    return () => {
      isMounted = false;
    };
  }, [serviceId, isAuthenticated]);

  useEffect(() => {
    if (!serviceId) return;
    const timer = window.setTimeout(() => {
      saveListingNote("service", serviceId, privateNote);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [serviceId, privateNote]);

  if (isLoading) return <LoadingScreen />;
  if (!s)
    return (
      <div className="page-container py-20 text-center text-text-secondary dark:text-slate-400">
        Service not found.
      </div>
    );

  const handleOrder = async (requirements: string, paymentMethod: string) => {
    if (!tier) return;
    await placeOrder.mutateAsync({
      serviceId: s._id,
      pricingTier: tier.name,
      requirements,
      paymentMethod,
    });
    setShowOrder(false);
  };

  const handleMessageSeller = async () => {
    if (!s?.seller?._id) return;
    const convo = await startConversation.mutateAsync(s.seller._id);
    if (convo?._id) {
      window.location.assign(
        `/messages?conversation=${encodeURIComponent(String(convo._id))}`,
      );
    }
  };

  const handleShareService = async () => {
    const outcome = await shareOrCopyLink({
      title: s.title,
      text: "Check out this service on Hupfumi",
    });

    if (outcome === "copied") toast.success("Service link copied");
    if (outcome === "failed") toast.error("Unable to share this service");
  };

  const handleToggleSave = async () => {
    if (!serviceId) return;
    try {
      await toggleSave.mutateAsync({ refType: "service", refId: serviceId });
      toast.success(isSaved ? "Removed from saved services" : "Saved service");
    } catch {
      toast.error("Unable to update saved services");
    }
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left */}
        <div className="flex-1 min-w-0 space-y-6">
          <div>
            <span className="badge badge-blue mb-3 block w-fit">
              {s.category}
            </span>
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white mb-4">
              {s.title}
            </h1>
          </div>

          {/* Seller */}
          {s.seller?.username ? (
            <Link
              to="/profile/$username"
              params={{ username: s.seller.username }}
              className="flex items-center gap-3 group"
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
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
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
                </div>
              </div>
            </div>
          )}

          {/* Gallery */}
          {s.gallery?.length > 0 && (
            <div className="grid grid-cols-2 gap-3">
              {s.gallery.slice(0, 4).map((img: any, i: number) => (
                <img
                  key={i}
                  src={img.url}
                  alt={`Gallery ${i + 1}`}
                  className="rounded-2xl w-full aspect-video object-cover"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          <div className="card p-6">
            <h2 className="font-semibold text-text-primary dark:text-white mb-3">
              About this service
            </h2>
            <p className="text-text-secondary dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {s.description}
            </p>
          </div>

          <div className="card p-6">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-brand-orange" />
                Private Service Notes
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
              className="input min-h-25 resize-y"
              placeholder="Capture scope clarifications, risks, and acceptance criteria. Stored only on your device."
              value={privateNote}
              onChange={(event) => setPrivateNote(event.target.value)}
            />
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2">
              Auto-saved locally and synced to your account when signed in.
            </p>
          </div>

          {/* Reviews */}
          <div>
            <h2 className="font-semibold text-text-primary dark:text-white mb-4">
              Reviews
            </h2>
            <ReviewSection
              refType="service"
              refId={s._id}
              emptyMessage="No reviews yet. Be the first to review!"
            />
          </div>

          {/* Related */}
          <RelatedServices category={s.category} excludeId={s._id} />

          {recentlyViewedServices.length > 0 && (
            <div>
              <h2 className="font-semibold text-text-primary dark:text-white mb-4">
                Recently Viewed Services
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {recentlyViewedServices.map((item) => (
                  <Link
                    key={item.id}
                    to="/services/$slug"
                    params={{ slug: item.slug }}
                    className="card overflow-hidden group hover:border-brand-orange/30 transition-all"
                  >
                    <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Settings
                            size={20}
                            className="text-text-disabled dark:text-slate-600"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="text-xs font-medium text-text-primary dark:text-white line-clamp-2 group-hover:text-brand-orange transition-colors">
                        {item.title}
                      </p>
                      <p className="text-xs text-brand-orange font-bold mt-1">
                        From {formatCurrency(item.price ?? 0)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {s.faqs?.length > 0 && (
            <div className="card p-6">
              <h2 className="font-semibold text-text-primary dark:text-white mb-4">
                FAQs
              </h2>
              <div className="space-y-4">
                {s.faqs.map((faq: any, i: number) => (
                  <div
                    key={i}
                    className="border-b border-surface-100 dark:border-dark-border pb-4 last:border-0 last:pb-0"
                  >
                    <p className="font-medium text-text-primary dark:text-white text-sm mb-1">
                      {faq.question}
                    </p>
                    <p className="text-text-secondary dark:text-slate-400 text-sm">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pricing sidebar */}
        <aside className="lg:w-85 shrink-0">
          <div className="card sticky top-20 overflow-hidden">
            {s.pricing?.length > 1 && (
              <div className="flex border-b border-surface-100 dark:border-dark-border">
                {s.pricing.map((t: any, i: number) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedTier(i)}
                    className={cn(
                      "flex-1 py-3 text-sm font-semibold capitalize transition-colors",
                      selectedTier === i
                        ? "bg-brand-navy text-white"
                        : "text-text-secondary dark:text-slate-400 hover:bg-surface-50 dark:hover:bg-dark-hover",
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}

            <div className="p-5 space-y-4">
              {tier && (
                <>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-text-primary dark:text-white">
                        {tier.title ?? tier.name}
                      </p>
                      {tier.description && (
                        <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5">
                          {tier.description}
                        </p>
                      )}
                    </div>
                    <p className="font-display font-bold text-2xl text-brand-navy dark:text-white">
                      {formatCurrency(tier.price)}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {tier.deliveryDays}d delivery
                    </span>
                    <span className="flex items-center gap-1">
                      <RefreshCw size={12} />
                      {tier.revisions ?? 1} revision
                      {tier.revisions !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div className="rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover p-3">
                    <p className="text-xs font-semibold text-text-primary dark:text-white mb-2 flex items-center gap-1.5">
                      <Calendar size={12} className="text-brand-orange" />
                      Delivery Forecast
                    </p>
                    <div className="space-y-1 text-xs text-text-secondary dark:text-slate-300">
                      <p>Kickoff: {formatDate(now)}</p>
                      <p>Progress review: {formatDate(progressCheckDate)}</p>
                      <p className="font-semibold text-brand-green">
                        Estimated completion:{" "}
                        {formatDate(estimatedDeliveryDate)}
                      </p>
                    </div>
                  </div>

                  {tier.features?.length > 0 && (
                    <ul className="space-y-2">
                      {tier.features.map((f: string, i: number) => (
                        <li
                          key={i}
                          className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300"
                        >
                          <Check
                            size={14}
                            className="text-brand-green shrink-0"
                          />
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}

              {!isOwner && isAuthenticated ? (
                <div className="space-y-2">
                  <button
                    type="button"
                    className="btn-primary w-full"
                    onClick={() => setShowOrder(true)}
                  >
                    Order Now <ChevronRight size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={handleMessageSeller}
                    disabled={startConversation.isPending}
                  >
                    Message Seller
                  </button>
                </div>
              ) : !isAuthenticated ? (
                <Link
                  to="/login"
                  className="btn-primary w-full flex justify-center"
                >
                  Log in to order
                </Link>
              ) : (
                <div className="p-3 bg-brand-navy/5 dark:bg-dark-hover rounded-xl text-sm text-brand-navy dark:text-white font-medium text-center">
                  You own this service
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareService}
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

              {/* Trust badges */}
              <div className="space-y-2 pt-2 border-t border-surface-100 dark:border-dark-border">
                {[
                  {
                    icon: Shield,
                    text: "Escrow-protected payment",
                    color: "text-brand-green",
                  },
                  {
                    icon: CheckCircle,
                    text: "Verified seller",
                    color: "text-blue-500",
                  },
                  {
                    icon: RefreshCw,
                    text: "Revision policy included",
                    color: "text-brand-orange",
                  },
                ].map(({ icon: Icon, text, color }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2 text-xs text-text-secondary dark:text-slate-400"
                  >
                    <Icon size={12} className={cn(color, "shrink-0")} />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <OrderModal
        open={showOrder}
        onClose={() => setShowOrder(false)}
        service={s}
        tier={tier}
        wallet={w}
        onOrder={handleOrder}
        isPending={placeOrder.isPending}
      />
    </div>
  );
}
