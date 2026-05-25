import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { Check, ChevronRight, Shield } from "lucide-react";

const PLANS = [
  {
    name: "Free",
    price: 0,
    desc: "Perfect for getting started",
    badge: "",
    color: "border-surface-200 dark:border-dark-border",
    features: [
      "List up to 5 services",
      "Browse all jobs & products",
      "Basic messaging",
      "7% platform fee on earnings",
      "KYC verification",
    ],
  },
  {
    name: "Pro",
    price: 9.99,
    desc: "For serious freelancers",
    badge: "Most Popular",
    color: "border-brand-orange",
    features: [
      "Unlimited service listings",
      "Featured badge on listings",
      "Priority search placement",
      "5% platform fee (save 2%)",
      "Advanced analytics dashboard",
      "Priority support",
      "Custom service packages",
    ],
  },
  {
    name: "Business",
    price: 29.99,
    desc: "For agencies & high-volume sellers",
    badge: "",
    color: "border-surface-200 dark:border-dark-border",
    features: [
      "Everything in Pro",
      "Team member accounts (up to 5)",
      "Bulk order management",
      "4% platform fee (save 3%)",
      "API access",
      "Dedicated account manager",
      "Custom invoicing",
    ],
  },
] as const;

const FAQS = [
  {
    q: "Is there a free plan?",
    a: "Yes. You can list services, browse jobs, and transact with no monthly cost. We only charge a 7% platform fee on successful transactions.",
  },
  {
    q: "How does the platform fee work?",
    a: "When a buyer pays you, the platform fee is automatically deducted. So if you earn $100 on the Free plan, you receive $93. On Pro it is $95, and on Business it is $96.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes, you can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades apply at the end of your billing cycle.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept EcoCash, Paynow, and bank transfers for platform subscriptions. All buyer-to-seller payments are also processed through these methods.",
  },
  {
    q: "Is KYC verification required?",
    a: "KYC is optional but strongly recommended. Verified sellers earn significantly more trust from buyers and receive a visible verified badge on their profiles.",
  },
];

export default function PricingPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section className="py-20 bg-surface-50 dark:bg-dark-bg text-center">
        <div className="page-container max-w-2xl">
          <p className="section-label mb-3">Pricing</p>
          <h1 className="section-title mb-4">Simple, transparent pricing</h1>
          <p className="text-text-secondary dark:text-slate-400 text-lg">
            Start free, upgrade when needed, and always know exactly what you
            pay.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, desc, badge, color, features }) => (
              <div
                key={name}
                className={cn(
                  "card p-7 flex flex-col relative border-2",
                  color,
                  badge && "scale-105 shadow-xl",
                )}
              >
                {badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 badge badge-orange px-3 py-1 shadow">
                    {badge}
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-display font-bold text-xl text-text-primary dark:text-white">
                    {name}
                  </h3>
                  <p className="text-text-tertiary dark:text-slate-500 text-sm mt-1">
                    {desc}
                  </p>
                  <div className="mt-4">
                    <span className="font-display font-black text-4xl text-brand-navy dark:text-white">
                      ${price === 0 ? "0" : price.toFixed(2)}
                    </span>
                    {price > 0 && (
                      <span className="text-text-tertiary dark:text-slate-500 text-sm">
                        /month
                      </span>
                    )}
                    {price === 0 && (
                      <span className="text-text-tertiary dark:text-slate-500 text-sm">
                        {" "}
                        forever
                      </span>
                    )}
                  </div>
                </div>
                <ul className="space-y-3 flex-1 mb-7">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        size={15}
                        className="text-brand-green shrink-0 mt-0.5"
                      />
                      <span className="text-sm text-text-secondary dark:text-slate-300">
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={cn(
                    "w-full justify-center",
                    badge ? "btn-primary" : "btn-secondary",
                  )}
                >
                  {price === 0 ? "Start free" : `Start ${name}`}{" "}
                  <ChevronRight size={14} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform fee callout */}
      <section className="py-12 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container max-w-3xl">
          <div className="card p-6 flex items-start gap-4">
            <div className="w-12 h-12 bg-brand-green/10 rounded-xl flex items-center justify-center shrink-0">
              <Shield size={22} className="text-brand-green" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary dark:text-white mb-1">
                All plans include escrow protection
              </h3>
              <p className="text-text-secondary dark:text-slate-400 text-sm leading-relaxed">
                Every transaction on Hupfumi regardless of plan is protected by
                our escrow system. Buyers pay first, funds are held securely,
                and released to sellers only upon confirmed delivery. Both sides
                are always protected.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-3xl">
          <h2 className="font-display font-bold text-2xl text-brand-navy dark:text-white mb-10 text-center">
            Frequently asked questions
          </h2>
          <div className="space-y-4">
            {FAQS.map(({ q, a }) => (
              <div key={q} className="card p-5">
                <p className="font-semibold text-text-primary dark:text-white mb-2">
                  {q}
                </p>
                <p className="text-text-secondary dark:text-slate-400 text-sm leading-relaxed">
                  {a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
