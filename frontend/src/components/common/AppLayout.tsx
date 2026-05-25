import {
  useLogout,
  useMarkNotificationsRead,
  useNotifications,
  useUnreadCount,
} from "@/hooks/useApi";
import api from "@/lib/api";
import { connectSocket, getSocket } from "@/lib/socket";
import { cn, formatRelativeTime, getInitials, storage } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  BarChart2,
  Bell,
  Briefcase,
  CheckCheck,
  ChevronDown,
  Clock,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  Moon,
  Package,
  Plus,
  Search,
  Settings,
  Shield,
  Sun,
  TrendingUp,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Spinner } from "./LoadingScreen";

const RECENT_KEY = "h_searches";

// ── Search Dropdown ───────────────────────────────────────────
function NavSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [suggestions, setSugg] = useState<any[]>([]);
  const [popular, setPopular] = useState<any[]>([]);
  const [idx, setIdx] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setRecent(storage.get<string[]>(RECENT_KEY, []));
    api
      .get("/search/popular")
      .then((r) => setPopular(r.data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) {
      setSugg([]);
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/search/suggestions", {
          params: { q },
        });
        setSugg(data.data?.suggestions ?? []);
      } catch {
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(timer.current);
  }, [q]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const addRecent = (term: string) => {
    const list = [
      term,
      ...storage.get<string[]>(RECENT_KEY, []).filter((t) => t !== term),
    ].slice(0, 6);
    storage.set(RECENT_KEY, list);
    setRecent(list);
  };

  const go = (term: string) => {
    addRecent(term);
    setOpen(false);
    setQ(term);
    navigate({ to: "/search", search: { q: term } });
  };

  const items =
    q.length >= 2
      ? suggestions
      : recent.map((t) => ({ text: t, type: "recent" }));
  const showDrop = open && (items.length > 0 || popular.length > 0 || loading);

  return (
    <div ref={wrapRef} className="relative flex-1 max-w-lg">
      <div
        className={cn(
          "flex items-center bg-surface-100 dark:bg-dark-card rounded-xl border-2 transition-all",
          open
            ? "border-brand-orange shadow-focus"
            : "border-transparent hover:border-surface-300 dark:hover:border-dark-border",
        )}
      >
        <Search
          size={15}
          className="ml-3.5 text-text-tertiary dark:text-slate-500 shrink-0"
          aria-hidden
        />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setIdx(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIdx((i) => Math.min(i + 1, items.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIdx((i) => Math.max(i - 1, -1));
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (idx >= 0 && items[idx]) go(items[idx].text);
              else if (q.trim()) go(q.trim());
            }
            if (e.key === "Escape") {
              setOpen(false);
              inputRef.current?.blur();
            }
          }}
          placeholder="Search jobs, services, products…"
          className="flex-1 px-3 py-2.5 text-sm bg-transparent outline-none text-text-primary dark:text-white placeholder:text-text-tertiary dark:placeholder:text-slate-500"
          aria-label="Search"
          aria-expanded={showDrop}
          aria-autocomplete="list"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setSugg([]);
              inputRef.current?.focus();
            }}
            className="mr-2 text-text-tertiary hover:text-text-secondary transition-colors p-1"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {showDrop && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-0 dark:bg-dark-card rounded-2xl border border-surface-200 dark:border-dark-border shadow-xl z-50 overflow-hidden animate-slide-down">
          {loading && (
            <div className="px-4 py-3 text-xs text-text-tertiary dark:text-slate-500">
              Searching…
            </div>
          )}

          {!loading && q.length >= 2 && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-text-tertiary dark:text-slate-500">
              No results for "{q}"
            </div>
          )}

          {items.length > 0 && (
            <ul role="listbox" className="py-1">
              {items.map((s, i) => (
                <li key={i} role="option" aria-selected={idx === i}>
                  <button
                    type="button"
                    onClick={() => go(s.text)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors",
                      idx === i
                        ? "bg-brand-orange-50 dark:bg-brand-orange/10 text-brand-orange"
                        : "hover:bg-surface-50 dark:hover:bg-dark-hover text-text-primary dark:text-white",
                    )}
                  >
                    {s.type === "recent" ? (
                      <Clock
                        size={13}
                        className="text-text-tertiary shrink-0"
                      />
                    ) : (
                      <Search
                        size={13}
                        className="text-text-tertiary shrink-0"
                      />
                    )}
                    <span className="flex-1 truncate">{s.text}</span>
                    <span className="text-xs text-text-tertiary dark:text-slate-500 capitalize shrink-0">
                      {s.type !== "recent" ? s.type : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {q.length < 2 && popular.length > 0 && (
            <div className="border-t border-surface-100 dark:border-dark-border px-4 py-3">
              <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-2">
                Trending
              </p>
              <div className="flex flex-wrap gap-2">
                {popular.slice(0, 6).map(({ term }: any) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => go(term)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-surface-100 dark:bg-dark-hover hover:bg-brand-orange-50 dark:hover:bg-brand-orange/10 hover:text-brand-orange text-text-secondary dark:text-slate-300 rounded-full transition-colors font-medium"
                  >
                    <TrendingUp size={10} /> {term}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Notification Bell ─────────────────────────────────────────
function NotificationBell() {
  const { isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const qc = useQueryClient();
  const { data: count = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications({ limit: "8" });
  const markRead = useMarkNotificationsRead();
  const notifs: any[] = (data as any)?.data ?? [];

  useEffect(() => {
    if (!isAuthenticated) return;
    connectSocket();
    const socket = getSocket();
    const onNew = () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [isAuthenticated, qc]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleOpen = useCallback(() => {
    const next = !open;
    setOpen(next);
    if (next && count > 0) setTimeout(() => markRead.mutate("all"), 1500);
  }, [open, count, markRead]);

  if (!isAuthenticated) return null;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={`Notifications${count > 0 ? `, ${count} unread` : ""}`}
        className="btn-icon relative"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-0 right-0 min-w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5 leading-none">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface-0 dark:bg-dark-card rounded-2xl border border-surface-200 dark:border-dark-border shadow-xl z-50 animate-slide-down overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-surface-100 dark:border-dark-border">
            <h3 className="font-semibold text-sm text-text-primary dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center gap-3">
              {count > 0 && (
                <button
                  type="button"
                  onClick={() => markRead.mutate("all")}
                  className="text-xs text-brand-orange hover:underline font-medium flex items-center gap-1"
                >
                  <CheckCheck size={11} /> All read
                </button>
              )}
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs text-text-tertiary dark:text-slate-500 hover:text-brand-orange transition-colors flex items-center gap-0.5"
              >
                All <ArrowUpRight size={11} />
              </Link>
            </div>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Spinner size={18} className="text-brand-orange" />
              </div>
            ) : notifs.length === 0 ? (
              <div className="text-center py-8 text-sm text-text-tertiary dark:text-slate-500">
                All caught up.
              </div>
            ) : (
              notifs.map((n: any) => (
                <div
                  key={n._id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 border-b border-surface-50 dark:border-dark-border last:border-0 transition-colors hover:bg-surface-50 dark:hover:bg-dark-hover",
                    !n.isRead && "bg-brand-orange-50/40 dark:bg-brand-orange/5",
                  )}
                >
                  <div className="w-8 h-8 bg-brand-navy/10 dark:bg-brand-navy/30 rounded-lg flex items-center justify-center shrink-0">
                    <Bell size={13} className="text-brand-orange" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-text-primary dark:text-white leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-text-secondary dark:text-slate-400 mt-0.5 line-clamp-2">
                      {n.body}
                    </p>
                    <p className="text-[10px] text-text-tertiary dark:text-slate-500 mt-1">
                      {formatRelativeTime(n.createdAt)}
                    </p>
                  </div>
                  {!n.isRead && (
                    <div className="w-1.5 h-1.5 bg-brand-orange rounded-full mt-1.5 shrink-0" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── User Menu ─────────────────────────────────────────────────
function UserMenu() {
  const { user } = useAuthStore();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const MENU = isAdmin
    ? [
        { to: "/admin", icon: Shield, label: "Overview" },
        { to: "/admin/kyc", icon: CheckCheck, label: "KYC" },
        { to: "/admin/moderation", icon: AlertTriangle, label: "Moderation" },
        { to: "/admin/users", icon: Users, label: "Users" },
        { to: "/admin/disputes", icon: AlertTriangle, label: "Disputes" },
      ]
    : [
        { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
        { to: "/analytics", icon: BarChart2, label: "Analytics" },
        { to: "/saved", icon: Heart, label: "Saved Items" },
        { to: "/wallet", icon: Wallet, label: "Wallet" },
        { to: `/profile/${user?.username}`, icon: User, label: "Profile" },
        { to: "/settings/profile", icon: Settings, label: "Settings" },
      ];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
        aria-label="User menu"
        aria-expanded={open}
      >
        {user?.avatar ? (
          <img src={user.avatar} alt="" className="avatar w-8 h-8" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center">
            {getInitials(user?.fullName ?? "U")}
          </div>
        )}
        <span className="hidden sm:block text-sm font-medium text-text-primary dark:text-white max-w-25 truncate">
          {user?.fullName?.split(" ")[0]}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-text-tertiary transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-surface-0 dark:bg-dark-card rounded-2xl border border-surface-200 dark:border-dark-border shadow-xl z-50 overflow-hidden animate-slide-down py-1">
          <div className="px-4 py-3 border-b border-surface-100 dark:border-dark-border">
            <p className="font-semibold text-sm text-text-primary dark:text-white truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-text-tertiary dark:text-slate-500 truncate">
              {user?.email}
            </p>
          </div>
          {MENU.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-text-secondary dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-dark-hover hover:text-brand-orange transition-colors"
            >
              <Icon size={15} className="shrink-0" />
              {label}
            </Link>
          ))}
          <div className="border-t border-surface-100 dark:border-dark-border mt-1 pt-1">
            <button
              type="button"
              onClick={() => logout.mutate()}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 w-full text-left transition-colors"
            >
              <LogOut size={15} className="shrink-0" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AppLayout ────────────────────────────────────────────
export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const router = useRouterState();
  const isHome = router.location.pathname === "/";
  const isAdmin = ["admin", "superadmin"].includes(user?.role ?? "");

  const NAV = isAdmin
    ? [
        { to: "/admin", label: "Overview", icon: Shield },
        { to: "/admin/kyc", label: "KYC", icon: CheckCheck },
        { to: "/admin/moderation", label: "Moderation", icon: AlertTriangle },
        { to: "/admin/users", label: "Users", icon: Users },
        { to: "/admin/disputes", label: "Disputes", icon: AlertTriangle },
      ]
    : [
        { to: "/jobs", label: "Jobs", icon: Briefcase },
        { to: "/services", label: "Services", icon: Settings },
        { to: "/products", label: "Products", icon: Package },
      ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-surface-0/95 dark:bg-dark-surface/95 backdrop-blur-xl border-b border-surface-200 dark:border-dark-border">
        <div className="page-container">
          <div className="flex items-center h-16 gap-4">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 shrink-0 mr-2">
              <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center shadow-orange">
                <span className="text-white font-display font-black text-lg">
                  H
                </span>
              </div>
              <span className="font-display font-bold text-brand-navy dark:text-white text-lg hidden sm:block">
                Hupfumi
              </span>
            </Link>

            {/* Desktop nav */}
            <nav
              className="hidden md:flex items-center gap-0.5"
              role="navigation"
              aria-label="Main"
            >
              {NAV.map(({ to, label }) => (
                <Link key={to} to={to} className="nav-link text-sm">
                  {label}
                </Link>
              ))}
            </nav>

            {/* Search — hidden on homepage (has its own) */}
            {!isHome && !isAdmin && (
              <div className="hidden lg:flex flex-1 max-w-md">
                <NavSearch />
              </div>
            )}

            <div className="flex-1" />

            {/* Right actions */}
            <div className="flex items-center gap-1.5">
              {/* Dark mode */}
              <button
                type="button"
                onClick={toggleTheme}
                className="btn-icon"
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {isAuthenticated ? (
                isAdmin ? (
                  <>
                    <Link
                      to="/admin"
                      className="hidden md:flex btn-primary text-sm gap-1.5 py-2 px-3"
                    >
                      <Shield size={14} /> Console
                    </Link>
                    <UserMenu />
                  </>
                ) : (
                  <>
                    <Link
                      to="/messages"
                      className="btn-icon hidden sm:flex"
                      aria-label="Messages"
                    >
                      <MessageSquare size={18} />
                    </Link>
                    <NotificationBell />
                    <Link
                      to="/jobs/new"
                      className="hidden md:flex btn-primary text-sm gap-1.5 py-2 px-3"
                    >
                      <Plus size={14} /> Post
                    </Link>
                    <UserMenu />
                  </>
                )
              ) : (
                <>
                  <Link
                    to="/login"
                    className="btn-ghost text-sm hidden sm:flex"
                  >
                    Sign in
                  </Link>
                  <Link to="/register" className="btn-primary text-sm">
                    Get started
                  </Link>
                </>
              )}

              {/* Mobile menu toggle */}
              <button
                type="button"
                onClick={() => setMobileOpen((p) => !p)}
                className="btn-icon md:hidden"
                aria-label="Menu"
              >
                {mobileOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-200 dark:border-dark-border bg-surface-0 dark:bg-dark-surface animate-slide-down">
            <div className="page-container py-4 space-y-1">
              <Link
                to="/"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
              >
                <Home size={16} /> Home
              </Link>
              {NAV.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover transition-colors"
                >
                  <Icon size={16} /> {label}
                </Link>
              ))}
              {!isHome && !isAdmin && (
                <div className="pt-2 pb-1">
                  <NavSearch />
                </div>
              )}
              {isAuthenticated ? (
                isAdmin ? (
                  <div className="pt-2 border-t border-surface-100 dark:border-dark-border space-y-1">
                    <Link
                      to="/admin"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <Shield size={16} /> Admin Overview
                    </Link>
                    <Link
                      to="/admin/kyc"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <CheckCheck size={16} /> KYC Reviews
                    </Link>
                    <Link
                      to="/admin/moderation"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <AlertTriangle size={16} /> Content Moderation
                    </Link>
                    <Link
                      to="/admin/users"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <Users size={16} /> Manage Users
                    </Link>
                    <Link
                      to="/admin/disputes"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <AlertTriangle size={16} /> Review Disputes
                    </Link>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-surface-100 dark:border-dark-border space-y-1">
                    <Link
                      to="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <LayoutDashboard size={16} /> Dashboard
                    </Link>
                    <Link
                      to="/messages"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary dark:text-slate-300 hover:bg-surface-100 dark:hover:bg-dark-hover"
                    >
                      <MessageSquare size={16} /> Messages
                    </Link>
                    <Link
                      to="/jobs/new"
                      onClick={() => setMobileOpen(false)}
                      className="btn-primary w-full justify-center mt-2"
                    >
                      <Plus size={15} /> Post a Job
                    </Link>
                  </div>
                )
              ) : (
                <div className="pt-2 border-t border-surface-100 dark:border-dark-border flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="btn-secondary w-full justify-center"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="btn-primary  w-full justify-center"
                  >
                    Get started
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="flex-1 animate-fade-in">{children}</main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-brand-navy dark:bg-dark-surface border-t border-surface-200 dark:border-dark-border mt-auto">
        <div className="page-container py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center">
                  <span className="text-white font-display font-black text-lg">
                    H
                  </span>
                </div>
                <span className="font-display font-bold text-white text-lg">
                  Hupfumi
                </span>
              </div>
              <p className="text-blue-200/60 text-sm leading-relaxed">
                Build. Trade. Earn. Zimbabwe's most powerful marketplace for
                talent and goods.
              </p>
            </div>
            {[
              {
                title: "Marketplace",
                links: [
                  ["Jobs", "/jobs"],
                  ["Services", "/services"],
                  ["Products", "/products"],
                ],
              },
              {
                title: "Company",
                links: [
                  ["About", "/about"],
                  ["Pricing", "/pricing"],
                  ["Contact", "/contact"],
                  ["Security", "/security"],
                  ["Leaderboard", "/leaderboard"],
                ],
              },
              {
                title: "Legal",
                links: [
                  ["Terms", "/terms"],
                  ["Privacy", "/privacy"],
                ],
              },
            ].map(({ title, links }) => (
              <div key={title}>
                <h4 className="font-semibold text-white text-sm mb-4">
                  {title}
                </h4>
                <ul className="space-y-2.5">
                  {links.map(([label, to]) => (
                    <li key={label}>
                      <Link
                        to={to}
                        className="text-blue-200/60 text-sm hover:text-white transition-colors"
                      >
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-blue-200/40 text-xs">
              © 2025 Hupfumi (Pvt) Ltd · Harare, Zimbabwe
            </p>
            <p className="text-blue-200/40 text-xs">
              All payments secured by escrow
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
