import { useBuyerOrders, useSellerOrders } from "@/hooks/useApi";
import {
  cn,
  formatCurrency,
  formatRelativeTime,
  getOrderStatusColor,
} from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Clock,
  Package,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

export default function OrdersPage() {
  const [tab, setTab] = useState<"buying" | "selling">("buying");
  const { data: buyerData, isLoading: bl } = useBuyerOrders();
  const { data: sellerData, isLoading: sl } = useSellerOrders();
  const orders =
    tab === "buying"
      ? ((buyerData as any)?.data ?? [])
      : ((sellerData as any)?.data ?? []);
  const isLoading = tab === "buying" ? bl : sl;

  return (
    <div className="page-container py-10 animate-fade-in max-w-4xl">
      <div className="mb-8">
        <h1 className="section-title">My Orders</h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm mt-1">
          Track and manage all your transactions
        </p>
      </div>

      <div className="tab-bar w-fit mb-8">
        <button
          type="button"
          onClick={() => setTab("buying")}
          className={cn("tab", tab === "buying" && "tab-active")}
        >
          <ShoppingBag size={14} className="inline mr-1.5" />
          Buying
        </button>
        <button
          type="button"
          onClick={() => setTab("selling")}
          className={cn("tab", tab === "selling" && "tab-active")}
        >
          <TrendingUp size={14} className="inline mr-1.5" />
          Selling
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-24 rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-14 text-center">
          <div className="w-16 h-16 bg-surface-100 dark:bg-dark-card rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package
              size={28}
              className="text-text-tertiary dark:text-slate-500"
            />
          </div>
          <p className="font-display font-bold text-xl text-text-primary dark:text-white mb-2">
            No {tab} orders yet
          </p>
          <p className="text-text-secondary dark:text-slate-400 text-sm mb-5">
            {tab === "buying"
              ? "Browse our marketplace to find what you need."
              : "List a service or product to start selling."}
          </p>
          <Link
            to={tab === "buying" ? "/services" : "/services/new"}
            className="btn-primary"
          >
            {tab === "buying" ? "Browse Services" : "Create a Service"}
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <Link
              key={order._id}
              to="/orders/$id"
              params={{ id: order._id }}
              className="card p-5 flex items-center justify-between gap-4 hover:border-brand-orange/30 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-surface-100 dark:bg-dark-card rounded-xl flex items-center justify-center shrink-0">
                  <Package
                    size={18}
                    className="text-text-secondary dark:text-slate-400"
                  />
                </div>
                <div>
                  <p className="font-semibold text-text-primary dark:text-white text-sm group-hover:text-brand-orange transition-colors">
                    {order.orderNumber}
                  </p>
                  <p className="text-xs text-text-tertiary dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    <Clock size={10} /> {formatRelativeTime(order.createdAt)} ·{" "}
                    <span className="capitalize">{order.orderType}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span
                  className={cn("badge", getOrderStatusColor(order.status))}
                >
                  {order.status?.replace(/_/g, " ")}
                </span>
                <span className="font-bold text-brand-navy dark:text-white">
                  {formatCurrency(order.total)}
                </span>
                <ChevronRight
                  size={16}
                  className="text-text-tertiary group-hover:text-brand-orange transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
