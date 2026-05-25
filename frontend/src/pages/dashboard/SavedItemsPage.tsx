import { Spinner } from "@/components/common/LoadingScreen";
import { useSavedItems, useToggleSave } from "@/hooks/useApi";
import { cn, formatCurrency } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Briefcase,
  ExternalLink,
  Heart,
  Package,
  Search,
  Settings,
} from "lucide-react";
import { useState } from "react";

type Tab = "" | "job" | "service" | "product";

const TABS: { v: Tab; l: string; icon: React.ElementType }[] = [
  { v: "", l: "All", icon: Heart },
  { v: "job", l: "Jobs", icon: Briefcase },
  { v: "service", l: "Services", icon: Settings },
  { v: "product", l: "Products", icon: Package },
];

export default function SavedItemsPage() {
  const [tab, setTab] = useState<Tab>("");
  const [search, setSearch] = useState("");
  const { data, isLoading } = useSavedItems(tab || undefined);
  const toggle = useToggleSave();

  const allItems: any[] = (data as any)?.items ?? [];
  const total = (data as any)?.total ?? allItems.length;
  const filtered = search
    ? allItems.filter((i) =>
        i.title?.toLowerCase().includes(search.toLowerCase()),
      )
    : allItems;

  const badgeClass: Record<string, string> = {
    job: "badge-blue",
    service: "badge-orange",
    product: "badge-green",
  };

  const getLink = (item: any) => {
    if (item.refType === "job") return `/jobs/${item.slug}`;
    if (item.refType === "service") return `/services/${item.slug}`;
    return `/products/${item.slug}`;
  };

  return (
    <div className="page-container py-10 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="section-title">Saved Items</h1>
          <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
            {total} saved item{total !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {/* Tabs + search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="tab-bar">
          {TABS.map(({ v, l, icon: Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={cn(
                "tab flex items-center gap-1.5",
                tab === v && "tab-active",
              )}
            >
              <Icon size={13} /> {l}
            </button>
          ))}
        </div>
        {allItems.length > 4 && (
          <div className="relative sm:ml-auto">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              className="input pl-8 text-sm w-full sm:w-52"
              placeholder="Search saved…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}
      </div>

      {allItems.length > 0 && (
        <div className="card p-4 mb-6 bg-surface-50 dark:bg-dark-hover border-surface-200 dark:border-dark-border">
          <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-widest mb-2">
            Saved strategy
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-text-secondary dark:text-slate-400">
            <p>Compare prices and delivery times before committing.</p>
            <p>Check ratings, reviews, and seller verification badges.</p>
            <p>Use saved items to shortlist then message top choices.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Spinner size={28} className="text-brand-orange" />
        </div>
      ) : allItems.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-950/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Heart size={28} className="text-red-300" />
          </div>
          <h2 className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            Nothing saved yet
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            Use the heart icon on any listing to save it here for later review.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/jobs" className="btn-secondary text-sm">
              Browse Jobs
            </Link>
            <Link to="/services" className="btn-secondary text-sm">
              Browse Services
            </Link>
            <Link to="/products" className="btn-secondary text-sm">
              Browse Products
            </Link>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-text-secondary dark:text-slate-400">
            No {tab || "items"} match "{search}"
          </p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="btn-ghost mt-3 text-sm text-brand-orange"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item: any) => (
            <div
              key={item._id}
              className="card p-4 flex items-center gap-4 hover:border-brand-orange/20 transition-all group"
            >
              {/* Thumbnail */}
              <Link
                to={getLink(item)}
                className="shrink-0 w-14 h-14 rounded-xl overflow-hidden bg-surface-100 dark:bg-dark-card block"
              >
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {item.refType === "job" ? (
                      <Briefcase
                        size={20}
                        className="text-text-disabled dark:text-slate-600"
                      />
                    ) : item.refType === "service" ? (
                      <Settings
                        size={20}
                        className="text-text-disabled dark:text-slate-600"
                      />
                    ) : (
                      <Package
                        size={20}
                        className="text-text-disabled dark:text-slate-600"
                      />
                    )}
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "badge text-[10px] capitalize",
                      badgeClass[item.refType] ?? "badge-gray",
                    )}
                  >
                    {item.refType}
                  </span>
                </div>
                <Link to={getLink(item)}>
                  <p className="font-semibold text-text-primary dark:text-white truncate group-hover:text-brand-orange transition-colors">
                    {item.title}
                  </p>
                </Link>
                {item.price && (
                  <p className="text-sm font-bold text-brand-orange mt-0.5">
                    {formatCurrency(item.price)}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={getLink(item)}
                  className="w-8 h-8 border border-surface-200 dark:border-dark-border hover:border-brand-orange/30 rounded-xl flex items-center justify-center transition-colors"
                  aria-label="View listing"
                >
                  <ExternalLink
                    size={14}
                    className="text-text-tertiary group-hover:text-brand-orange"
                  />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    toggle.mutate({ refType: item.refType, refId: item.refId })
                  }
                  disabled={toggle.isPending}
                  className="w-8 h-8 border border-surface-200 dark:border-dark-border hover:border-red-300 dark:hover:border-red-700 rounded-xl flex items-center justify-center transition-colors"
                  aria-label="Remove from saved"
                >
                  {toggle.isPending ? (
                    <Spinner size={12} className="text-text-tertiary" />
                  ) : (
                    <Heart size={14} className="text-red-500 fill-red-500" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
