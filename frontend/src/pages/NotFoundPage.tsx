import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Briefcase,
  Home,
  Package,
  Search,
  Settings,
} from "lucide-react";

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-[80vh] flex items-center justify-center page-container py-20 animate-fade-in">
      <div className="max-w-lg w-full text-center">
        {/* Animated 404 */}
        <div className="relative mb-8 select-none">
          <p
            className="font-display font-black leading-none"
            style={{
              fontSize: "clamp(7rem, 20vw, 10rem)",
              color: "#F97316",
            }}
          >
            404
          </p>
          <div
            className="absolute inset-0 flex items-center justify-center"
            aria-hidden
          >
            <Search
              size={32}
              className="text-surface-300 dark:text-dark-border opacity-60"
            />
          </div>
        </div>

        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-3">
          Page not found
        </h1>
        <p className="text-text-secondary dark:text-slate-400 mb-10 leading-relaxed">
          The page you are looking for does not exist, was removed, or the link
          is broken.
        </p>

        {/* Quick nav cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { to: "/", icon: Home, label: "Home" },
            { to: "/jobs", icon: Briefcase, label: "Jobs" },
            { to: "/services", icon: Settings, label: "Services" },
            { to: "/products", icon: Package, label: "Products" },
          ].map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className="card p-4 flex flex-col items-center gap-2 hover:border-brand-orange/30 transition-all group"
            >
              <div className="w-10 h-10 bg-surface-100 dark:bg-dark-card rounded-xl flex items-center justify-center group-hover:bg-brand-orange/10 transition-colors">
                <Icon
                  size={18}
                  className="text-text-secondary dark:text-slate-400 group-hover:text-brand-orange transition-colors"
                />
              </div>
              <span className="text-xs font-semibold text-text-secondary dark:text-slate-400 group-hover:text-brand-orange transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>

        <div className="flex gap-3 justify-center">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="btn-secondary"
          >
            <ArrowLeft size={15} /> Go back
          </button>
          <Link to="/" className="btn-primary">
            <Home size={15} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
