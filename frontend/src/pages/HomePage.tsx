import { useTrending } from "@/hooks/useApi";
import api from "@/lib/api";
import { cn, formatCurrency, storage } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Briefcase,
  Car,
  CheckCircle,
  ChevronRight,
  Clock,
  Code,
  Coffee,
  Cpu,
  Leaf,
  Lock,
  MessageSquare,
  Package,
  Palette,
  PenTool,
  Search,
  Settings,
  Shield,
  Shirt,
  ShoppingBag,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

const RECENT_KEY = "h_searches";

function HeroSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [popular, setPop] = useState<any[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [sugg, setSugg] = useState<any[]>([]);
  const [loading, setLoad] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setRecent(storage.get<string[]>(RECENT_KEY, []));
    api
      .get("/search/popular")
      .then((r) => setPop(r.data.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.length < 2) {
      setSugg([]);
      return;
    }
    setLoad(true);
    timer.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/search/suggestions", {
          params: { q },
        });
        setSugg(data.data?.suggestions ?? []);
      } catch {
      } finally {
        setLoad(false);
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

  const go = (term: string) => {
    if (!term.trim()) return;
    const list = [
      term,
      ...storage.get<string[]>(RECENT_KEY, []).filter((t) => t !== term),
    ].slice(0, 6);
    storage.set(RECENT_KEY, list);
    navigate({ to: "/search", search: { q: term } });
  };

  const items =
    q.length >= 2 ? sugg : recent.map((t) => ({ text: t, type: "recent" }));
  const showDrop = open && (items.length > 0 || popular.length > 0 || loading);

  return (
    <div ref={wrapRef} className="relative max-w-2xl w-full">
      <div
        className={cn(
          "flex items-center bg-white rounded-2xl border-2 transition-all shadow-2xl",
          open ? "border-brand-orange" : "border-transparent",
        )}
      >
        <Search
          size={20}
          className="ml-4 text-text-tertiary shrink-0"
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && q.trim()) go(q.trim());
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder="Search jobs, services, products, talent…"
          className="flex-1 px-4 py-4 text-text-primary text-base bg-transparent outline-none placeholder:text-text-tertiary"
          aria-label="Search Hupfumi"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setSugg([]);
            }}
            className="mr-2 text-text-tertiary hover:text-text-secondary p-1"
          >
            <X size={16} />
          </button>
        )}
        <button
          type="button"
          onClick={() => go(q)}
          className="m-2 bg-brand-orange hover:bg-brand-orange-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-orange hover:shadow-orange-lg flex items-center gap-2 shrink-0"
        >
          Search <ArrowRight size={15} />
        </button>
      </div>

      {showDrop && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-surface-200 shadow-xl z-50 overflow-hidden animate-slide-down">
          {loading && (
            <div className="px-4 py-3 text-sm text-text-tertiary">
              Searching…
            </div>
          )}
          {items.length > 0 && (
            <ul className="py-1">
              {items.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => go(s.text)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-surface-50 text-text-primary transition-colors text-left"
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
                    <span className="text-xs text-text-tertiary capitalize">
                      {s.type !== "recent" ? s.type : "Recent"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {q.length < 2 && popular.length > 0 && (
            <div className="border-t border-surface-100 px-4 py-3">
              <p className="text-xs font-semibold text-text-tertiary uppercase tracking-wide mb-2.5">
                Trending
              </p>
              <div className="flex flex-wrap gap-2">
                {popular.slice(0, 8).map(({ term }: any) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => go(term)}
                    className="flex items-center gap-1 text-xs px-3 py-1.5 bg-surface-100 hover:bg-brand-orange-50 hover:text-brand-orange text-text-secondary rounded-full transition-colors font-medium"
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

function AnimatedCounter({
  end,
  suffix = "",
  prefix = "",
}: {
  end: number;
  suffix?: string;
  prefix?: string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !started.current) {
          started.current = true;
          const step = end / 60;
          const t = setInterval(
            () =>
              setCount((n) => {
                const next = n + step;
                if (next >= end) {
                  clearInterval(t);
                  return end;
                }
                return Math.floor(next);
              }),
            25,
          );
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end]);
  return (
    <span ref={ref}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

const TICKER = [
  "Web developer hired · $450",
  "Logo design delivered · $80",
  "iPhone 15 Pro listed · $850",
  "Content writer hired · $120",
  "UI redesign ordered · $350",
  "Farm equipment sold · $1,200",
  "Mobile app developed · $2,500",
  "Marketing consultant · $200",
  "Jewellery listed · $35",
  "Civil engineer hired · $900",
];

const CATEGORIES = [
  {
    icon: Code,
    label: "Tech & Dev",
    to: "/services",
    category: "Technology",
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    ic: "text-blue-500",
  },
  {
    icon: Palette,
    label: "Design",
    to: "/services",
    category: "Design",
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    ic: "text-purple-500",
  },
  {
    icon: PenTool,
    label: "Writing",
    to: "/services",
    category: "Writing",
    bg: "bg-yellow-500/10 dark:bg-yellow-500/20",
    ic: "text-yellow-600",
  },
  {
    icon: TrendingUp,
    label: "Marketing",
    to: "/services",
    category: "Marketing",
    bg: "bg-green-500/10 dark:bg-green-500/20",
    ic: "text-green-500",
  },
  {
    icon: Briefcase,
    label: "Engineering",
    to: "/jobs",
    category: "Engineering",
    bg: "bg-orange-500/10 dark:bg-orange-500/20",
    ic: "text-orange-500",
  },
  {
    icon: Cpu,
    label: "Electronics",
    to: "/products",
    category: "Electronics",
    bg: "bg-indigo-500/10 dark:bg-indigo-500/20",
    ic: "text-indigo-500",
  },
  {
    icon: Shirt,
    label: "Fashion",
    to: "/products",
    category: "Fashion",
    bg: "bg-pink-500/10 dark:bg-pink-500/20",
    ic: "text-pink-500",
  },
  {
    icon: Leaf,
    label: "Agriculture",
    to: "/products",
    category: "Agriculture",
    bg: "bg-lime-500/10 dark:bg-lime-500/20",
    ic: "text-lime-500",
  },
  {
    icon: Car,
    label: "Automotive",
    to: "/products",
    category: "Automotive",
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    ic: "text-cyan-500",
  },
  {
    icon: Coffee,
    label: "Food & Bev",
    to: "/products",
    category: "Food",
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    ic: "text-amber-500",
  },
  {
    icon: BookOpen,
    label: "Education",
    to: "/services",
    category: "Education",
    bg: "bg-teal-500/10 dark:bg-teal-500/20",
    ic: "text-teal-500",
  },
  {
    icon: ShoppingBag,
    label: "General",
    to: "/products",
    category: undefined,
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    ic: "text-rose-500",
  },
] as const;

const FEATURES = [
  {
    icon: Shield,
    title: "Full Escrow Protection",
    accent: "bg-emerald-500",
    desc: "Every payment is held securely and released only when you confirm the work is complete.",
  },
  {
    icon: Zap,
    title: "Paynow & EcoCash Native",
    accent: "bg-brand-orange",
    desc: "No foreign cards needed. Built around Zimbabwe's payment ecosystem from day one.",
  },
  {
    icon: Award,
    title: "KYC Verified Sellers",
    accent: "bg-blue-500",
    desc: "Every verified seller has passed identity checks. The badge means you are dealing with a real person.",
  },
  {
    icon: BarChart2,
    title: "Analytics Dashboard",
    accent: "bg-purple-500",
    desc: "Track your earnings, views, orders, and conversion in real time from one clean dashboard.",
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    accent: "bg-red-500",
    desc: "bcrypt passwords, JWT rotation, rate limiting, AES-256 encryption on all sensitive data.",
  },
  {
    icon: MessageSquare,
    title: "Real-time Messaging",
    accent: "bg-yellow-500",
    desc: "WebSocket-powered encrypted chat with typing indicators, read receipts, and file sharing.",
  },
] as const;

const TESTIMONIALS = [
  {
    name: "Tanaka Moyo",
    role: "Freelance Developer",
    city: "Harare",
    rating: 5,
    text: "Found three long-term clients in my first month. The escrow system means I never chase payments.",
  },
  {
    name: "Rutendo Khumalo",
    role: "Online Retailer",
    city: "Bulawayo",
    rating: 5,
    text: "Had my first sale within 48 hours. EcoCash checkout makes buying incredibly easy for everyone.",
  },
  {
    name: "Simba Tafara",
    role: "Engineering Firm Owner",
    city: "Harare",
    rating: 5,
    text: "We hire exclusively through Hupfumi now. KYC verification gives us full confidence in candidates.",
  },
] as const;

export default function HomePage() {
  const { data: trending } = useTrending();
  const doubled = [...TICKER, ...TICKER];

  return (
    <div className="animate-fade-in">
      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HERO */}
      <section
        className="relative overflow-hidden"
        style={{
          backgroundColor: "#0A1628",
          minHeight: "92vh",
        }}
      >
        {/* Ambient bg */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute top-[-10%] right-[-5%] w-175 h-175 rounded-full opacity-[0.12]"
            style={{
              backgroundColor: "#F97316",
              filter: "blur(96px)",
            }}
          />
          <div
            className="absolute bottom-[-15%] left-[-8%] w-125 h-125 rounded-full opacity-[0.07]"
            style={{
              backgroundColor: "#10B981",
              filter: "blur(96px)",
            }}
          />
        </div>

        {/* Floating activity cards */}
        <div
          className="absolute top-28 right-[8%] hidden xl:flex items-center gap-3 pr-4 card-glass rounded-2xl p-3 animate-float"
          aria-hidden
        >
          <div className="w-9 h-9 bg-brand-green/20 rounded-xl flex items-center justify-center">
            <CheckCircle size={18} className="text-brand-green" />
          </div>
          <div>
            <p className="text-[11px] text-white/50 leading-none mb-0.5">
              Order completed
            </p>
            <p className="text-sm text-white font-semibold">$450 released</p>
          </div>
        </div>
        <div
          className="absolute top-52 right-[3%] hidden xl:flex items-center gap-3 pr-4 card-glass rounded-2xl p-3 animate-float-slow"
          aria-hidden
        >
          <div className="w-9 h-9 bg-yellow-400/20 rounded-xl flex items-center justify-center">
            <Star size={16} className="text-yellow-400 fill-yellow-400" />
          </div>
          <div>
            <p className="text-[11px] text-white/50 leading-none mb-0.5">
              New review
            </p>
            <p className="text-sm text-white font-semibold">★★★★★ Excellent!</p>
          </div>
        </div>
        <div
          className="absolute bottom-32 right-[13%] hidden xl:flex items-center gap-3 pr-4 card-glass rounded-2xl p-3 animate-float"
          style={{ animationDelay: "0.8s" }}
          aria-hidden
        >
          <div className="w-9 h-9 bg-blue-400/20 rounded-xl flex items-center justify-center">
            <Users size={16} className="text-blue-400" />
          </div>
          <div>
            <p className="text-[11px] text-white/50 leading-none mb-0.5">
              New hire
            </p>
            <p className="text-sm text-white font-semibold">
              Developer matched
            </p>
          </div>
        </div>

        <div
          className="page-container relative z-10 flex flex-col justify-center"
          style={{
            minHeight: "80vh",
            paddingTop: "5rem",
            paddingBottom: "3rem",
          }}
        >
          <div className="max-w-3xl">
            {/* Headline */}
            <h1
              className="font-display font-black text-white leading-[0.9] tracking-tight mb-6 animate-slide-up"
              style={{
                fontSize: "clamp(3rem, 7vw, 5.5rem)",
                animationDelay: "0.1s",
              }}
            >
              Zimbabwe's{" "}
              <span className="text-brand-orange">Most Powerful</span>
              <br />
              Marketplace
            </h1>

            <p
              className="text-lg md:text-xl text-blue-200/75 max-w-xl leading-relaxed mb-10 animate-slide-up font-light"
              style={{ animationDelay: "0.2s" }}
            >
              Find talent, hire professionals, buy and sell with{" "}
              <span className="text-white font-medium">
                full escrow protection
              </span>
              .
            </p>

            {/* Search */}
            <div
              className="animate-slide-up mb-6"
              style={{ animationDelay: "0.3s" }}
            >
              <HeroSearch />
            </div>

            {/* Quick links */}
            <div
              className="flex flex-wrap gap-2 items-center animate-slide-up"
              style={{ animationDelay: "0.35s" }}
            >
              <span className="text-xs text-blue-300/40 font-medium">
                Popular:
              </span>
              {[
                "Web Dev",
                "Logo Design",
                "Solar Panels",
                "Content Writing",
                "Photography",
                "Catering",
              ].map((tag) => (
                <Link
                  key={tag}
                  to="/search"
                  search={{ q: tag }}
                  className="text-xs text-blue-200/70 border border-white/10 px-3 py-1.5 rounded-full hover:bg-white/10 hover:text-white hover:border-white/20 transition-all"
                >
                  {tag}
                </Link>
              ))}
            </div>

            {/* Trust signals */}
            <div
              className="flex flex-wrap gap-5 mt-10 animate-slide-up"
              style={{ animationDelay: "0.4s" }}
            >
              {[
                { I: Shield, t: "Escrow Protected" },
                { I: Zap, t: "Paynow & EcoCash" },
                { I: Users, t: "10,000+ Members" },
                { I: Award, t: "KYC Verified" },
              ].map(({ I, t }) => (
                <div
                  key={t}
                  className="flex items-center gap-1.5 text-sm text-blue-200/60"
                >
                  <I size={14} className="text-brand-orange" aria-hidden /> {t}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live ticker */}
        <div className="relative z-10 overflow-hidden border-y border-white/10 bg-white/5 py-3">
          <div className="animate-ticker whitespace-nowrap inline-block">
            {doubled.map((item, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 mx-10 text-sm text-blue-100/60 font-medium"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="page-container relative z-10 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              {
                end: 10000,
                suf: "+",
                label: "Active members",
                icon: Users,
                color: "text-blue-600 dark:text-blue-400",
              },
              {
                end: 5000,
                suf: "+",
                label: "Jobs posted",
                icon: Briefcase,
                color: "text-brand-orange",
              },
              {
                end: 3000,
                suf: "+",
                label: "Services listed",
                icon: Settings,
                color: "text-emerald-600 dark:text-emerald-400",
              },
              {
                end: 2,
                suf: "M+",
                label: "USD transacted",
                pre: "$",
                icon: TrendingUp,
                color: "text-purple-600 dark:text-purple-400",
              },
            ].map(({ end, suf, pre = "", label, icon: Icon, color }) => (
              <div key={label} className="group">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-surface-100 dark:bg-dark-card group-hover:scale-110 transition-transform duration-300">
                  <Icon size={22} className={color} aria-hidden />
                </div>
                <div className={cn("stat-number", color)}>
                  <AnimatedCounter end={end} suffix={suf} prefix={pre} />
                </div>
                <p className="text-sm text-text-tertiary dark:text-slate-400 mt-1">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ CATEGORIES */}
      <section className="py-24 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="section-label mb-2">Explore</p>
              <h2 className="section-title">Browse by category</h2>
            </div>
            <Link
              to="/search"
              className="hidden sm:flex items-center gap-1 text-sm text-brand-orange font-semibold hover:underline"
            >
              All categories <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CATEGORIES.map(({ icon: Icon, label, to, category, bg, ic }) => (
              <Link
                key={label}
                to={to}
                search={category ? { category } : undefined}
                className="card-interactive p-4 text-center group rounded-2xl"
              >
                <div
                  className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform duration-300",
                    bg,
                  )}
                >
                  <Icon size={20} className={ic} aria-hidden />
                </div>
                <p className="text-xs font-semibold text-text-secondary dark:text-slate-300 group-hover:text-brand-orange transition-colors">
                  {label}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HOW IT WORKS */}
      <section className="py-24 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-5xl">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Simple process</p>
            <h2 className="section-title">Get started in 3 steps</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                n: "01",
                icon: Users,
                title: "Create your account",
                desc: "Sign up free in 60 seconds. Verify your email and you are live — no credit card required.",
              },
              {
                n: "02",
                icon: Search,
                title: "Find or post",
                desc: "Search thousands of listings or post your own job, service, or product in minutes.",
              },
              {
                n: "03",
                icon: Shield,
                title: "Transact safely",
                desc: "Pay via EcoCash or Paynow. Funds held in escrow until you confirm completion.",
              },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div
                key={n}
                className="card p-7 text-center relative group hover:border-brand-orange/30 transition-all"
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-brand-orange text-white text-xs font-bold rounded-full flex items-center justify-center shadow-orange">
                  {n}
                </div>
                <div className="w-14 h-14 bg-brand-navy/5 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mt-4 mb-5 group-hover:scale-110 transition-transform duration-300">
                  <Icon
                    size={26}
                    className="text-brand-navy dark:text-white"
                    aria-hidden
                  />
                </div>
                <h3 className="font-display font-bold text-lg text-text-primary dark:text-white mb-2">
                  {title}
                </h3>
                <p className="text-text-secondary dark:text-slate-400 text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TRENDING SERVICES */}
      {trending?.trendingServices?.length > 0 && (
        <section className="py-24 bg-surface-50 dark:bg-dark-bg">
          <div className="page-container">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="section-label mb-2">Services</p>
                <h2 className="section-title">Top-rated services</h2>
              </div>
              <Link
                to="/services"
                className="hidden sm:flex items-center gap-1 text-sm text-brand-orange font-semibold hover:underline"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {trending.trendingServices.slice(0, 4).map((s: any) => (
                <Link
                  key={s._id}
                  to="/services/$slug"
                  params={{ slug: s.slug }}
                  className="card overflow-hidden group card-interactive"
                >
                  <div className="aspect-video bg-surface-100 dark:bg-dark-card overflow-hidden">
                    {s.gallery?.[0]?.url ? (
                      <img
                        src={s.gallery[0].url}
                        alt={s.title}
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
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-5 h-5 rounded-full bg-brand-navy flex items-center justify-center text-white text-[9px] font-bold shrink-0">
                        {s.seller?.fullName?.[0]}
                      </div>
                      <span className="text-xs text-text-tertiary dark:text-slate-500 truncate">
                        {s.seller?.fullName}
                      </span>
                      {s.seller?.isVerifiedBadge && (
                        <CheckCircle
                          size={12}
                          className="text-brand-green shrink-0"
                        />
                      )}
                    </div>
                    <p className="text-sm font-semibold text-text-primary dark:text-white line-clamp-2 mb-3 group-hover:text-brand-orange transition-colors">
                      {s.title}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star
                          size={11}
                          className="text-yellow-400 fill-yellow-400"
                        />
                        <span className="text-xs text-text-tertiary">
                          {s.stats?.averageRating > 0
                            ? s.stats.averageRating.toFixed(1)
                            : "New"}
                        </span>
                      </div>
                      {s.pricing?.[0]?.price && (
                        <span className="text-sm font-bold text-brand-navy dark:text-white">
                          From {formatCurrency(s.pricing[0].price)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TRENDING PRODUCTS */}
      {trending?.trendingProducts?.length > 0 && (
        <section className="py-24 bg-white dark:bg-dark-surface">
          <div className="page-container">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="section-label mb-2">Products</p>
                <h2 className="section-title">Featured listings</h2>
              </div>
              <Link
                to="/products"
                className="hidden sm:flex items-center gap-1 text-sm text-brand-orange font-semibold hover:underline"
              >
                View all <ArrowRight size={14} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {trending.trendingProducts.slice(0, 8).map((p: any) => (
                <Link
                  key={p._id}
                  to="/products/$slug"
                  params={{ slug: p.slug }}
                  className="card overflow-hidden group card-interactive"
                >
                  <div className="aspect-square bg-surface-100 dark:bg-dark-card overflow-hidden relative">
                    {p.images?.[0]?.url ? (
                      <img
                        src={p.images[0].url}
                        alt={p.title}
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
                    <span
                      className={cn(
                        "absolute top-2 right-2 badge",
                        p.condition === "new" ? "badge-green" : "badge-gray",
                      )}
                    >
                      {p.condition}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-text-primary dark:text-white line-clamp-2 mb-1">
                      {p.title}
                    </p>
                    <p className="text-base font-bold text-brand-orange">
                      {formatCurrency(p.price)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ FEATURES */}
      <section
        className="py-28 relative overflow-hidden"
        style={{
          backgroundColor: "#070e1a",
        }}
      >
        <div
          className="absolute top-12 right-8 h-56 w-56 rounded-full bg-brand-orange/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute bottom-8 left-8 h-48 w-48 rounded-full bg-brand-green/10 blur-3xl"
          aria-hidden
        />
        <div className="page-container relative z-10">
          <div className="text-center mb-16">
            <p className="section-label mb-4">Platform features</p>
            <h2
              className="font-display font-bold text-white mb-5"
              style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
            >
              Everything you need.
            </h2>
            <p className="text-blue-200/50 text-lg max-w-xl mx-auto">
              Built from the ground up for Zimbabwe — not adapted from a foreign
              template.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon: Icon, title, desc, accent }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-white/8 hover:border-white/18 transition-all group cursor-default"
                style={{
                  backgroundColor: "rgba(255,255,255,0.04)",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300",
                    accent,
                  )}
                >
                  <Icon size={22} className="text-white" aria-hidden />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">
                  {title}
                </h3>
                <p className="text-blue-200/50 text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TESTIMONIALS */}
      <section className="py-24 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-5xl">
          <div className="text-center mb-16">
            <p className="section-label mb-3">Testimonials</p>
            <h2 className="section-title">Trusted by Zimbabweans</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TESTIMONIALS.map(({ name, role, city, text, rating }) => (
              <div
                key={name}
                className="card p-6 hover:border-brand-orange/30 transition-all group"
              >
                <div
                  className="flex gap-0.5 mb-4"
                  aria-label={`${rating} out of 5 stars`}
                >
                  {Array.from({ length: rating }).map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className="text-yellow-400 fill-yellow-400"
                      aria-hidden
                    />
                  ))}
                </div>
                <blockquote className="text-text-secondary dark:text-slate-300 text-sm leading-relaxed mb-5 italic">
                  "{text}"
                </blockquote>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {name[0]}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-text-primary dark:text-white">
                      {name}
                    </p>
                    <p className="text-xs text-text-tertiary dark:text-slate-500">
                      {role} · {city}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ CTA */}
      <section className="py-28 relative overflow-hidden bg-brand-orange">
        <div
          className="absolute top-[-20%] right-[-8%] w-125 h-125 rounded-full bg-white/10 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div
          className="absolute inset-0 opacity-[0.08] bg-white/5"
          aria-hidden
        />
        <div className="page-container max-w-3xl text-center relative z-10">
          <h2
            className="font-display font-bold text-white mb-5 leading-tight"
            style={{ fontSize: "clamp(2rem, 5vw, 3.25rem)" }}
          >
            Start building your future today
          </h2>
          <p className="text-orange-100/80 text-lg md:text-xl mb-10 leading-relaxed">
            Join 10,000+ Zimbabweans on the platform built for them.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-brand-orange font-bold text-base rounded-xl hover:bg-orange-50 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5"
            >
              Create free account <ArrowRight size={18} />
            </Link>
            <Link
              to="/about"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 text-white font-bold text-base rounded-xl border-2 border-white/30 hover:bg-white/10 hover:border-white/50 transition-all"
            >
              Learn more
            </Link>
          </div>
          <p className="text-orange-200/50 text-sm mt-6">
            No credit card required · Free forever plan available
          </p>
        </div>
      </section>
    </div>
  );
}
