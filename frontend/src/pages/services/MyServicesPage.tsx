import { Spinner } from "@/components/common/LoadingScreen";
import { useDeleteService, useMyServices } from "@/hooks/useApi";
import { cn, formatCurrency } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertCircle,
  Eye,
  MoreVertical,
  Plus,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trash2,
} from "lucide-react";
import { useState } from "react";

export default function MyServicesPage() {
  const { data, isLoading, refetch } = useMyServices();
  const deleteService = useDeleteService();
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<string | null>(null);

  const services: any[] = (data as any)?.data ?? [];
  const filtered = search
    ? services.filter((s) =>
        s.title.toLowerCase().includes(search.toLowerCase()),
      )
    : services;

  const statusColor: Record<string, string> = {
    active: "badge-green",
    draft: "badge-gray",
    paused: "badge-amber",
    suspended: "badge-red",
  };

  const handleDelete = async (id: string) => {
    await deleteService.mutateAsync(id);
    setToDelete(null);
    refetch();
  };

  return (
    <div className="page-container py-10 animate-fade-in">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">My Services</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {services.length} service{services.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link to="/services/new" className="btn-primary">
          <Plus size={15} />
          Create Service
        </Link>
      </div>

      {/* Stats */}
      {services.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            {
              l: "Active",
              v: services.filter((s) => s.status === "active").length,
              c: "text-brand-green",
            },
            {
              l: "Total Views",
              v: services.reduce((a, s) => a + (s.stats?.views ?? 0), 0),
              c: "text-blue-600 dark:text-blue-400",
            },
            {
              l: "Total Orders",
              v: services.reduce((a, s) => a + (s.stats?.orders ?? 0), 0),
              c: "text-purple-600 dark:text-purple-400",
            },
            {
              l: "Avg Rating",
              v: (() => {
                const r = services.filter((s) => s.stats?.averageRating > 0);
                return r.length
                  ? (
                      r.reduce((a, s) => a + s.stats.averageRating, 0) /
                      r.length
                    ).toFixed(1) + " ★"
                  : "—";
              })(),
              c: "text-brand-amber",
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

      {services.length > 4 && (
        <div className="relative mb-4">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            className="input pl-8 text-sm max-w-xs"
            placeholder="Filter services…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : services.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Settings size={28} className="text-purple-600" />
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No services yet
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            Create a service to start earning. It takes less than 5 minutes.
          </p>
          <Link to="/services/new" className="btn-primary">
            Create your first service
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((svc: any) => (
            <div
              key={svc._id}
              className="card overflow-hidden group relative hover:border-brand-orange/30 transition-all"
            >
              {/* Context menu */}
              <div className="absolute top-2 right-2 z-10">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu(openMenu === svc._id ? null : svc._id)
                  }
                  className="w-8 h-8 bg-black/40 hover:bg-black/60 rounded-lg flex items-center justify-center transition-colors"
                  aria-label="Options"
                >
                  <MoreVertical size={14} className="text-white" />
                </button>
                {openMenu === svc._id && (
                  <div className="absolute right-0 top-9 w-40 bg-surface-0 dark:bg-dark-card rounded-xl border border-surface-200 dark:border-dark-border shadow-xl z-20 py-1 animate-slide-down">
                    <Link
                      to="/services/$slug"
                      params={{ slug: svc.slug }}
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
                          `/services/new?edit=${encodeURIComponent(String(svc._id))}`,
                        );
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-text-secondary dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-dark-hover w-full text-left transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenu(null);
                        setToDelete(svc._id);
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 w-full text-left transition-colors"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  </div>
                )}
              </div>

              <Link
                to="/services/$slug"
                params={{ slug: svc.slug }}
                className="block"
              >
                <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
                  {svc.gallery?.[0]?.url ? (
                    <img
                      src={svc.gallery[0].url}
                      alt={svc.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Settings
                        size={32}
                        className="text-text-disabled dark:text-slate-600"
                      />
                    </div>
                  )}
                </div>
              </Link>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={cn(
                      "badge text-[10px]",
                      statusColor[svc.status] ?? "badge-gray",
                    )}
                  >
                    {svc.status}
                  </span>
                  <span className="badge badge-blue text-[10px]">
                    {svc.category}
                  </span>
                </div>
                <Link to="/services/$slug" params={{ slug: svc.slug }}>
                  <p className="font-semibold text-text-primary dark:text-white line-clamp-2 hover:text-brand-orange transition-colors">
                    {svc.title}
                  </p>
                </Link>
                {svc.pricing?.[0]?.price && (
                  <p className="text-sm font-bold text-brand-orange mt-1">
                    From {formatCurrency(svc.pricing[0].price)}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-text-tertiary dark:text-slate-500 mt-3 pt-3 border-t border-surface-100 dark:border-dark-border">
                  <span className="flex items-center gap-1">
                    <Eye size={10} />
                    {svc.stats?.views ?? 0}
                  </span>
                  <span className="flex items-center gap-1">
                    <ShoppingBag size={10} />
                    {svc.stats?.orders ?? 0} orders
                  </span>
                  {svc.stats?.averageRating > 0 && (
                    <span className="flex items-center gap-1 ml-auto">
                      <Star size={10} className="text-yellow-400" />
                      {svc.stats.averageRating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete modal */}
      {toDelete && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget) setToDelete(null);
          }}
        >
          <div className="bg-surface-0 dark:bg-dark-card rounded-2xl w-full max-w-sm p-6 animate-slide-up border border-surface-200 dark:border-dark-border">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-red-500" />
            </div>
            <h3 className="font-display font-bold text-lg text-text-primary dark:text-white text-center mb-2">
              Delete service?
            </h3>
            <p className="text-text-secondary dark:text-slate-400 text-sm text-center mb-5">
              This will permanently remove this service and all its listings.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setToDelete(null)}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDelete(toDelete)}
                disabled={deleteService.isPending}
                className="btn-danger flex-1 justify-center"
              >
                {deleteService.isPending ? (
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
