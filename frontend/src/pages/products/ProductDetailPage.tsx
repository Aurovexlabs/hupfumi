import LoadingScreen from "@/components/common/LoadingScreen";
import ReviewSection from "@/components/common/ReviewSection";
import {
  useCheckSaved,
  useProduct,
  useRelatedProducts,
  useStartConversation,
  useToggleSave,
} from "@/hooks/useApi";
import {
  getListingNote,
  hydrateListingNotesFromCloud,
  saveListingNote,
} from "@/lib/listingNotes";
import {
  hydrateProductCompareFromCloud,
  isProductCompared,
  toggleProductCompareItem,
} from "@/lib/productCompare";
import {
  getRecentlyViewed,
  type RecentlyViewedItem,
  trackRecentlyViewed,
} from "@/lib/recentlyViewed";
import { cn, formatCurrency, getInitials, shareOrCopyLink } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";
import {
  Bookmark,
  FileText,
  Package,
  Scale,
  Share2,
  Shield,
  Star,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function useSlug() {
  const parts = window.location.pathname.split("/");
  return parts[parts.indexOf("products") + 1] ?? "";
}

function RelatedProducts({
  category,
  excludeId,
}: {
  category: string;
  excludeId: string;
}) {
  const { data: related = [] } = useRelatedProducts(category, excludeId);
  const list = (related as any[])
    .filter((p) => p._id !== excludeId)
    .slice(0, 4);
  if (!list.length) return null;
  return (
    <div className="mt-10">
      <h2 className="font-semibold text-text-primary dark:text-white mb-4">
        Similar Products
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {list.map((p: any) => (
          <Link
            key={p._id}
            to="/products/$slug"
            params={{ slug: p.slug }}
            className="card overflow-hidden group hover:border-brand-orange/30 transition-all"
          >
            <div className="aspect-square bg-surface-100 dark:bg-dark-card overflow-hidden">
              {p.images?.[0]?.url ? (
                <img
                  src={p.images[0].url}
                  alt={p.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package size={20} className="text-text-disabled" />
                </div>
              )}
            </div>
            <div className="p-2.5">
              <p className="text-xs font-medium text-text-primary dark:text-white line-clamp-2">
                {p.title}
              </p>
              <p className="font-bold text-brand-orange text-xs mt-0.5">
                ${p.price}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function ProductDetailPage() {
  const slug = useSlug();
  const { data: product, isLoading } = useProduct(slug);
  const startConversation = useStartConversation();
  const toggleSave = useToggleSave();
  const { isAuthenticated } = useAuthStore();
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [privateNote, setPrivateNote] = useState("");
  const [isCompared, setIsCompared] = useState(false);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<
    RecentlyViewedItem[]
  >([]);

  const p = (product as any) ?? null;
  const productId = p?._id ? String(p._id) : "";
  const { data: isSaved = false } = useCheckSaved("product", productId);

  const price = p?.discount?.value
    ? p.discount.type === "percent"
      ? p.price * (1 - p.discount.value / 100)
      : p.price - p.discount.value
    : Number(p?.price ?? 0);
  const inStock = (p?.inventory?.quantity ?? 0) > 0;

  useEffect(() => {
    if (!p?._id || !p?.slug) return;

    trackRecentlyViewed("product", {
      id: String(p._id),
      slug: String(p.slug),
      title: String(p.title || "Untitled product"),
      subtitle: String(p.category || ""),
      price: Number(p.price || 0),
      imageUrl: p.images?.[0]?.url,
    });

    setRecentlyViewedProducts(getRecentlyViewed("product", String(p._id), 4));
  }, [p?._id, p?.slug, p?.title, p?.category, p?.price, p?.images]);

  useEffect(() => {
    let isMounted = true;
    setPrivateNote(productId ? getListingNote("product", productId) : "");
    setIsCompared(productId ? isProductCompared(productId) : false);

    const hydrateCloudWorkspace = async () => {
      if (!productId || !isAuthenticated) return;

      await Promise.all([
        hydrateListingNotesFromCloud(),
        hydrateProductCompareFromCloud(),
      ]);

      if (!isMounted) return;
      setPrivateNote(getListingNote("product", productId));
      setIsCompared(isProductCompared(productId));
    };

    void hydrateCloudWorkspace();

    return () => {
      isMounted = false;
    };
  }, [productId, isAuthenticated]);

  useEffect(() => {
    if (!productId) return;
    const timer = window.setTimeout(() => {
      saveListingNote("product", productId, privateNote);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [productId, privateNote]);

  if (isLoading) return <LoadingScreen />;
  if (!p)
    return (
      <div className="page-container py-20 text-center text-text-secondary dark:text-slate-400">
        Product not found.
      </div>
    );

  const messageSeller = async () => {
    if (!p?.seller?._id) return;
    const convo = await startConversation.mutateAsync(p.seller._id);
    if (convo?._id) {
      window.location.assign(
        `/messages?conversation=${encodeURIComponent(String(convo._id))}`,
      );
    }
  };

  const handleShareProduct = async () => {
    const outcome = await shareOrCopyLink({
      title: p.title,
      text: "Check out this product on Hupfumi",
    });

    if (outcome === "copied") toast.success("Product link copied");
    if (outcome === "failed") toast.error("Unable to share this product");
  };

  const handleToggleSave = async () => {
    if (!productId) return;
    try {
      await toggleSave.mutateAsync({ refType: "product", refId: productId });
      toast.success(isSaved ? "Removed from saved products" : "Saved product");
    } catch {
      toast.error("Unable to update saved products");
    }
  };

  const handleToggleCompare = () => {
    if (!p?._id || !p?.slug) return;

    const result = toggleProductCompareItem({
      id: String(p._id),
      slug: String(p.slug),
      title: String(p.title),
      price,
      originalPrice: Number(p.price || 0),
      condition: p.condition ? String(p.condition) : undefined,
      category: p.category ? String(p.category) : undefined,
      rating: Number(p.stats?.averageRating || 0),
      stock: Number(p.inventory?.quantity || 0),
      imageUrl: p.images?.[0]?.url,
      sellerName: p.seller?.fullName,
    });

    if (result.atLimit) {
      toast.error("You can compare up to 3 products at a time.");
      return;
    }

    setIsCompared(result.items.some((item) => item.id === String(p._id)));
    toast.success(result.added ? "Added to compare" : "Removed from compare");
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-10">
        {/* Images */}
        <div className="lg:w-[45%] shrink-0">
          <div className="aspect-square rounded-2xl overflow-hidden bg-surface-100 dark:bg-dark-card mb-3">
            {p.images?.[selectedImg]?.url ? (
              <img
                src={p.images[selectedImg].url}
                alt={p.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package
                  size={64}
                  className="text-text-disabled dark:text-slate-600"
                />
              </div>
            )}
          </div>
          {p.images?.length > 1 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              {p.images.map((img: any, i: number) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedImg(i)}
                  className={cn(
                    "shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-colors",
                    selectedImg === i
                      ? "border-brand-orange"
                      : "border-transparent",
                  )}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className={cn(
                  "badge",
                  p.condition === "new" ? "badge-green" : "badge-gray",
                )}
              >
                {p.condition}
              </span>
              <span className="badge badge-blue">{p.category}</span>
            </div>
            <h1 className="font-display font-bold text-2xl text-brand-navy dark:text-white mb-3">
              {p.title}
            </h1>
            <div className="flex items-baseline gap-3">
              <p className="font-display font-bold text-3xl text-brand-orange">
                {formatCurrency(price)}
              </p>
              {p.discount?.value && (
                <p className="text-lg text-text-tertiary line-through">
                  {formatCurrency(p.price)}
                </p>
              )}
            </div>
            {p.stats?.averageRating > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className={cn(
                      i < Math.round(p.stats.averageRating)
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-surface-300 dark:text-dark-border",
                    )}
                  />
                ))}
                <span className="text-sm text-text-secondary dark:text-slate-400">
                  ({p.stats.reviewCount} reviews)
                </span>
              </div>
            )}
          </div>

          <hr className="divider" />

          <div className="text-sm text-text-secondary dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
            {p.description}
          </div>

          <div>
            <p
              className={cn(
                "text-sm font-semibold",
                inStock ? "text-brand-green" : "text-red-500",
              )}
            >
              {inStock ? `${p.inventory.quantity} in stock` : "Out of stock"}
            </p>
          </div>

          {inStock && (
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-surface-200 dark:border-dark-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="px-3 py-2 text-text-secondary dark:text-slate-400 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                >
                  −
                </button>
                <span className="px-4 py-2 font-semibold text-text-primary dark:text-white min-w-12 text-center">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQty((q) => Math.min(p.inventory.quantity, q + 1))
                  }
                  className="px-3 py-2 text-text-secondary dark:text-slate-400 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <div className="w-full max-w-xs space-y-2">
            {isAuthenticated ? (
              <button
                type="button"
                className="btn-primary w-full flex justify-center"
                onClick={messageSeller}
                disabled={startConversation.isPending}
              >
                Contact Seller
              </button>
            ) : (
              <Link
                to="/login"
                className="btn-primary w-full flex justify-center"
              >
                Log in to Buy
              </Link>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleShareProduct}
                className="btn-secondary w-full"
              >
                <Share2 size={14} /> Share
              </button>
              <button
                type="button"
                onClick={handleToggleCompare}
                className={cn(
                  "btn-ghost w-full",
                  isCompared &&
                    "bg-brand-navy text-white hover:bg-brand-navy/90 border-brand-navy",
                )}
              >
                <Scale size={14} /> {isCompared ? "Compared" : "Compare"}
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

          <div className="card p-5 max-w-2xl">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <FileText size={16} className="text-brand-orange" />
                Private Product Notes
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
              placeholder="Write decision notes, supplier questions, or quality checks. Stored only on your device."
              value={privateNote}
              onChange={(event) => setPrivateNote(event.target.value)}
            />
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2">
              Auto-saved locally and synced to your account when signed in.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-slate-400">
            <Shield size={12} className="text-brand-green shrink-0" />
            Buyer protection on every order
          </div>

          {/* Reviews */}
          <div className="mt-8">
            <h2 className="font-semibold text-text-primary dark:text-white mb-3">
              Customer Reviews
            </h2>
            <ReviewSection
              refType="product"
              refId={p._id}
              emptyMessage="No reviews yet for this product."
            />
          </div>

          {/* Seller */}
          {p.seller && (
            <Link
              to="/profile/$username"
              params={{ username: p.seller.username }}
              className="flex items-center gap-3 p-4 border border-surface-200 dark:border-dark-border rounded-xl hover:border-brand-orange/30 transition-colors max-w-xs group"
            >
              {p.seller.avatar ? (
                <img
                  src={p.seller.avatar}
                  alt=""
                  className="avatar w-10 h-10"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-brand-navy text-white text-xs font-bold flex items-center justify-center">
                  {getInitials(p.seller.fullName)}
                </div>
              )}
              <div>
                <p className="font-semibold text-sm text-text-primary dark:text-white group-hover:text-brand-orange transition-colors">
                  {p.seller.fullName}
                </p>
                <p className="text-xs text-text-tertiary dark:text-slate-500">
                  View seller profile →
                </p>
              </div>
            </Link>
          )}
        </div>
      </div>

      {recentlyViewedProducts.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold text-text-primary dark:text-white mb-4">
            Recently Viewed Products
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {recentlyViewedProducts.map((item) => (
              <Link
                key={item.id}
                to="/products/$slug"
                params={{ slug: item.slug }}
                className="card overflow-hidden group hover:border-brand-orange/30 transition-all"
              >
                <div className="aspect-square bg-surface-100 dark:bg-dark-card overflow-hidden">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package size={20} className="text-text-disabled" />
                    </div>
                  )}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-medium text-text-primary dark:text-white line-clamp-2">
                    {item.title}
                  </p>
                  <p className="font-bold text-brand-orange text-xs mt-0.5">
                    {formatCurrency(item.price ?? 0)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <RelatedProducts category={p.category} excludeId={p._id} />
    </div>
  );
}
