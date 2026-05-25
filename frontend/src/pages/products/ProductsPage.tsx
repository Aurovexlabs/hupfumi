import { useProducts } from "@/hooks/useApi";
import {
  clearProductCompareItems,
  getProductCompareItems,
  hydrateProductCompareFromCloud,
  toggleProductCompareItem,
  type ProductCompareItem,
} from "@/lib/productCompare";
import { cn, formatCurrency, storage } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Link } from "@tanstack/react-router";
import {
  Check,
  Package,
  Plus,
  Scale,
  Search,
  ShoppingBag,
  Star,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const CATS = [
  "Electronics",
  "Fashion",
  "Agriculture",
  "Automotive",
  "Food",
  "Home",
  "Health",
  "Education",
  "Other",
];
const CONDITIONS = [
  ["", "Any condition"],
  ["new", "New"],
  ["used", "Used"],
  ["refurbished", "Refurbished"],
];
const SORTS = [
  ["-createdAt", "Newest"],
  ["price", "Price: Low→High"],
  ["-price", "Price: High→Low"],
  ["-stats.sales", "Best Selling"],
];

const PRODUCTS_FILTER_STORAGE_KEY = "hupfumi-filters:products:v1";

const DEFAULT_PRODUCT_PARAMS: Record<string, string> = {
  page: "1",
  limit: "24",
  q: "",
  category: "",
  condition: "",
  maxPrice: "",
  sort: "-createdAt",
};

export default function ProductsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const isMarketplaceUser = !["admin", "superadmin"].includes(user?.role ?? "");
  const [params, setParams] = useState<Record<string, string>>(() => {
    const saved = storage.get<Record<string, string>>(
      PRODUCTS_FILTER_STORAGE_KEY,
      {},
    );
    return { ...DEFAULT_PRODUCT_PARAMS, ...saved };
  });
  const [compareItems, setCompareItems] = useState<ProductCompareItem[]>(() =>
    getProductCompareItems(),
  );
  const { data, isLoading } = useProducts(params);
  const products = (data as any)?.data ?? [];
  const pagination = (data as any)?.pagination;

  useEffect(() => {
    storage.set(PRODUCTS_FILTER_STORAGE_KEY, params);
  }, [params]);

  useEffect(() => {
    let isMounted = true;

    const hydrateCloudCompare = async () => {
      if (!isAuthenticated) return;
      await hydrateProductCompareFromCloud();

      if (isMounted) {
        setCompareItems(getProductCompareItems());
      }
    };

    void hydrateCloudCompare();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  const setFilter = (k: string, v: string) =>
    setParams((p) => ({ ...p, [k]: v, page: "1" }));
  const setPage = (page: string) => setParams((p) => ({ ...p, page }));
  const clearFilters = () => setParams(DEFAULT_PRODUCT_PARAMS);

  const discounted = (p: any) =>
    p.discount?.value
      ? p.discount.type === "percent"
        ? p.price * (1 - p.discount.value / 100)
        : p.price - p.discount.value
      : p.price;

  const buildCompareItem = (product: any): ProductCompareItem => ({
    id: String(product._id),
    slug: String(product.slug),
    title: String(product.title),
    price: Number(discounted(product) || 0),
    originalPrice: Number(product.price || 0),
    condition: product.condition ? String(product.condition) : undefined,
    category: product.category ? String(product.category) : undefined,
    rating: Number(product.stats?.averageRating || 0),
    stock: Number(product.inventory?.quantity || 0),
    imageUrl: product.images?.[0]?.url,
    sellerName: product.seller?.fullName,
  });

  const isCompared = (productId: string): boolean =>
    compareItems.some((item) => item.id === String(productId));

  const toggleCompare = (product: any) => {
    const result = toggleProductCompareItem(buildCompareItem(product));
    setCompareItems(result.items);

    if (result.atLimit) {
      toast.error("You can compare up to 3 products at a time.");
      return;
    }

    toast.success(result.added ? "Added to compare" : "Removed from compare");
  };

  const clearCompare = () => {
    clearProductCompareItems();
    setCompareItems([]);
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Shop Products</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {pagination?.total ?? 0} products listed
          </p>
        </div>
        {isAuthenticated && isMarketplaceUser && (
          <Link to="/products/new" className="btn-primary">
            <Plus size={15} />
            List Product
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-8 w-56 text-sm"
            placeholder="Search products…"
            value={params.q ?? ""}
            onChange={(e) => setFilter("q", e.target.value)}
          />
        </div>
        <select
          className="input w-44 text-sm"
          value={params.category ?? ""}
          onChange={(e) => setFilter("category", e.target.value)}
        >
          <option value="">All categories</option>
          {CATS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="input w-40 text-sm"
          value={params.condition ?? ""}
          onChange={(e) => setFilter("condition", e.target.value)}
        >
          {CONDITIONS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <input
          className="input w-36 text-sm"
          type="number"
          placeholder="Max price ($)"
          value={params.maxPrice ?? ""}
          onChange={(e) => setFilter("maxPrice", e.target.value)}
        />
        <select
          className="input w-44 text-sm"
          value={params.sort ?? "-createdAt"}
          onChange={(e) => setFilter("sort", e.target.value)}
        >
          {SORTS.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={clearFilters}
        >
          Clear filters
        </button>
      </div>

      {compareItems.length > 0 && (
        <section className="card p-5 mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-text-primary dark:text-white flex items-center gap-2">
                <Scale size={16} className="text-brand-orange" />
                Product Compare Workspace
              </h2>
              <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
                Compare price, condition, rating, and stock before choosing.
                Workspace syncs to your account when signed in.
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost text-xs py-1 px-2"
              onClick={clearCompare}
            >
              Clear compare
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-surface-100 dark:border-dark-border">
                  <th className="text-left py-2 pr-3 text-text-tertiary dark:text-slate-500 font-semibold">
                    Attribute
                  </th>
                  {compareItems.map((item) => (
                    <th
                      key={item.id}
                      className="text-left py-2 pr-4 min-w-44 align-top"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/products/$slug"
                          params={{ slug: item.slug }}
                          className="text-text-primary dark:text-white hover:text-brand-orange line-clamp-2"
                        >
                          {item.title}
                        </Link>
                        <button
                          type="button"
                          className="btn-icon w-6 h-6"
                          onClick={() => {
                            const result = toggleProductCompareItem(item);
                            setCompareItems(result.items);
                          }}
                          aria-label="Remove from compare"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-surface-100 dark:border-dark-border">
                  <td className="py-2 pr-3 text-text-tertiary dark:text-slate-500">
                    Price
                  </td>
                  {compareItems.map((item) => (
                    <td
                      key={`${item.id}-price`}
                      className="py-2 pr-4 text-brand-orange font-semibold"
                    >
                      {formatCurrency(item.price)}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-surface-100 dark:border-dark-border">
                  <td className="py-2 pr-3 text-text-tertiary dark:text-slate-500">
                    Condition
                  </td>
                  {compareItems.map((item) => (
                    <td
                      key={`${item.id}-condition`}
                      className="py-2 pr-4 capitalize text-text-secondary dark:text-slate-300"
                    >
                      {item.condition || "-"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-surface-100 dark:border-dark-border">
                  <td className="py-2 pr-3 text-text-tertiary dark:text-slate-500">
                    Category
                  </td>
                  {compareItems.map((item) => (
                    <td
                      key={`${item.id}-category`}
                      className="py-2 pr-4 text-text-secondary dark:text-slate-300"
                    >
                      {item.category || "-"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-surface-100 dark:border-dark-border">
                  <td className="py-2 pr-3 text-text-tertiary dark:text-slate-500">
                    Seller Rating
                  </td>
                  {compareItems.map((item) => (
                    <td
                      key={`${item.id}-rating`}
                      className="py-2 pr-4 text-text-secondary dark:text-slate-300"
                    >
                      {item.rating && item.rating > 0
                        ? item.rating.toFixed(1)
                        : "New"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2 pr-3 text-text-tertiary dark:text-slate-500">
                    Stock
                  </td>
                  {compareItems.map((item) => (
                    <td
                      key={`${item.id}-stock`}
                      className="py-2 pr-4 text-text-secondary dark:text-slate-300"
                    >
                      {(item.stock ?? 0) > 0
                        ? `${item.stock} available`
                        : "Out of stock"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          {compareItems.length < 2 && (
            <p className="text-xs text-text-tertiary dark:text-slate-500 mt-3">
              Add one more product to unlock full side-by-side comparison.
            </p>
          )}
        </section>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-2xl" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="card p-14 text-center">
          <ShoppingBag
            size={36}
            className="text-text-tertiary dark:text-slate-500 mx-auto mb-4"
          />
          <p className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No products found
          </p>
          {isAuthenticated && isMarketplaceUser && (
            <Link to="/products/new" className="btn-primary mt-3">
              List the first one
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {products.map((product: any) => {
              const price = discounted(product);
              const hasDisc = product.discount?.value;
              const compared = isCompared(String(product._id));
              return (
                <Link
                  key={product._id}
                  to="/products/$slug"
                  params={{ slug: product.slug }}
                  className="card overflow-hidden group card-interactive"
                >
                  <div className="aspect-square bg-surface-100 dark:bg-dark-card overflow-hidden relative">
                    {product.images?.[0]?.url ? (
                      <img
                        src={product.images[0].url}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package
                          size={32}
                          className="text-text-disabled dark:text-slate-600"
                        />
                      </div>
                    )}
                    {hasDisc && (
                      <span className="absolute top-2 left-2 badge badge-red">
                        -
                        {product.discount.type === "percent"
                          ? `${product.discount.value}%`
                          : `$${product.discount.value}`}
                      </span>
                    )}
                    <span
                      className={cn(
                        "absolute top-2 right-2 badge",
                        product.condition === "new"
                          ? "badge-green"
                          : "badge-gray",
                      )}
                    >
                      {product.condition}
                    </span>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        toggleCompare(product);
                      }}
                      className={cn(
                        "absolute bottom-2 right-2 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors flex items-center gap-1",
                        compared
                          ? "bg-brand-navy text-white border-brand-navy"
                          : "bg-white/90 text-text-primary border-surface-200 hover:border-brand-orange/40",
                      )}
                    >
                      {compared ? <Check size={11} /> : <Scale size={11} />}
                      {compared ? "Compared" : "Compare"}
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-primary dark:text-white line-clamp-2 mb-1">
                      {product.title}
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-brand-orange">
                        {formatCurrency(price)}
                      </p>
                      {hasDisc && (
                        <p className="text-xs text-text-tertiary line-through">
                          {formatCurrency(product.price)}
                        </p>
                      )}
                    </div>
                    {product.stats?.averageRating > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star
                          size={10}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-xs text-text-tertiary">
                          {product.stats.averageRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                className="btn-secondary text-sm"
                disabled={!pagination.hasPrev}
                onClick={() => setPage(String(pagination.page - 1))}
              >
                Previous
              </button>
              <span className="text-sm text-text-secondary dark:text-slate-400">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                className="btn-secondary text-sm"
                disabled={!pagination.hasNext}
                onClick={() => setPage(String(pagination.page + 1))}
              >
                Next
              </button>
            </div>
          )}

          <section className="card p-6 mt-8">
            <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
              How Product Transactions Work
            </h2>
            <p className="text-sm text-text-secondary dark:text-slate-400 mb-4">
              Buy and sell with a structured flow that protects both buyers and
              sellers from listing to fulfillment.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                "1. Compare product condition, price, seller rating, and location context.",
                "2. Confirm stock and delivery details before checkout.",
                "3. Track order status and complete only after successful receipt.",
              ].map((step) => (
                <div
                  key={step}
                  className="rounded-xl border border-surface-100 dark:border-dark-border bg-surface-50 dark:bg-dark-hover p-4 text-sm text-text-secondary dark:text-slate-300"
                >
                  {step}
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              <Link
                to="/security"
                className="text-brand-orange hover:underline"
              >
                Learn how transaction protection works
              </Link>
              <Link to="/terms" className="text-brand-orange hover:underline">
                Review marketplace obligations and guarantees
              </Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
