import { Spinner } from "@/components/common/LoadingScreen";
import { useDeleteProduct, useMyProducts } from "@/hooks/useApi";
import { cn, formatCurrency } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Eye,
  MoreVertical,
  Package,
  Plus,
  Search,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

export default function MyProductsPage() {
  const { data, isLoading, refetch } = useMyProducts();
  const deleteProduct = useDeleteProduct();
  const [search, setSearch] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const products: any[] = (data as any)?.data ?? [];
  const filtered = search
    ? products.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  const handleDelete = async (id: string) => {
    await deleteProduct.mutateAsync(id);
    setConfirmDelete(null);
    refetch();
  };

  const statusColor: Record<string, string> = {
    active: "badge-green",
    draft: "badge-gray",
    paused: "badge-amber",
    sold: "badge-blue",
    suspended: "badge-red",
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">My Products</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {products.length} product{products.length !== 1 ? "s" : ""} listed
          </p>
        </div>
        <Link to="/products/new" className="btn-primary">
          <Plus size={15} />
          List Product
        </Link>
      </div>

      {/* Stats strip */}
      {products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              l: "Active",
              v: products.filter((p) => p.status === "active").length,
              c: "text-brand-green",
            },
            {
              l: "Total views",
              v: products.reduce((a, p) => a + (p.stats?.views ?? 0), 0),
              c: "text-blue-600 dark:text-blue-400",
            },
            {
              l: "Total sold",
              v: products.reduce((a, p) => a + (p.stats?.sales ?? 0), 0),
              c: "text-purple-600 dark:text-purple-400",
            },
            {
              l: "Revenue",
              v: formatCurrency(
                products.reduce((a, p) => a + (p.stats?.revenue ?? 0), 0),
              ),
              c: "text-brand-orange",
            },
          ].map(({ l, v, c }) => (
            <div key={l} className="card p-4">
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                {l}
              </p>
              <p className={cn("font-display font-bold text-xl mt-0.5", c)}>
                {v}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {products.length > 4 && (
        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-8 text-sm w-full max-w-xs"
            placeholder="Filter products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : products.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package size={28} className="text-green-600" />
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No products listed
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            Start selling — list your first product in minutes.
          </p>
          <Link to="/products/new" className="btn-primary">
            List your first product
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-text-secondary dark:text-slate-400">
            No products match "{search}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product: any) => (
            <div
              key={product._id}
              className="card overflow-hidden group relative hover:border-brand-orange/30 transition-all"
            >
              {/* Menu */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu(openMenu === product._id ? null : product._id)
                  }
                  className="w-8 h-8 bg-black/40 hover:bg-black/60 rounded-lg flex items-center justify-center transition-colors"
                  aria-label="Options"
                >
                  <MoreVertical size={14} className="text-white" />
                </button>
                {openMenu === product._id && (
                  <div className="absolute right-0 top-9 w-40 bg-surface-0 dark:bg-dark-card rounded-xl border border-surface-200 dark:border-dark-border shadow-xl z-20 py-1 animate-slide-down">
                    <Link
                      to="/products/$slug"
                      params={{ slug: product.slug }}
                      onClick={() => setOpenMenu(null)}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors"
                    >
                      <Eye size={13} />
                      View listing
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        window.location.assign(
                          `/products/new?edit=${encodeURIComponent(String(product._id))}`,
                        );
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-dark-hover transition-colors w-full text-left"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setConfirmDelete(product._id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 w-full text-left transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Image */}
              <Link
                to="/products/$slug"
                params={{ slug: product.slug }}
                className="block"
              >
                <div className="aspect-square bg-surface-100 dark:bg-dark-card overflow-hidden">
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
                        size={36}
                        className="text-text-disabled dark:text-slate-600"
                      />
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "badge text-[10px]",
                      statusColor[product.status] ?? "badge-gray",
                    )}
                  >
                    {product.status}
                  </span>
                  <span
                    className={cn(
                      "badge text-[10px]",
                      product.condition === "new" ? "badge-blue" : "badge-gray",
                    )}
                  >
                    {product.condition}
                  </span>
                </div>
                <Link
                  to="/products/$slug"
                  params={{ slug: product.slug }}
                  className="block"
                >
                  <p className="font-semibold text-text-primary dark:text-white text-sm line-clamp-2 hover:text-brand-orange transition-colors">
                    {product.title}
                  </p>
                </Link>
                <p className="font-bold text-brand-orange mt-1">
                  {formatCurrency(product.price)}
                </p>

                <div className="flex items-center gap-3 text-xs text-text-tertiary dark:text-slate-500 mt-2">
                  <span className="flex items-center gap-1">
                    <Eye size={10} />
                    {product.stats?.views ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <TrendingUp size={10} />
                    {product.stats?.sales ?? 0} sold
                  </span>
                  <span className="ml-auto">
                    {product.inventory?.quantity ?? 0} left
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDelete(null);
          }}
        >
          <div className="bg-surface-0 dark:bg-dark-card rounded-2xl w-full max-w-sm p-6 animate-slide-up border border-surface-200 dark:border-dark-border">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-text-primary dark:text-white text-center mb-2">
              Delete product?
            </h3>
            <p className="text-text-secondary dark:text-slate-400 text-sm text-center mb-5">
              This action cannot be undone. The listing will be permanently
              removed.
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
                disabled={deleteProduct.isPending}
                className="btn-danger flex-1 justify-center"
              >
                {deleteProduct.isPending ? (
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
