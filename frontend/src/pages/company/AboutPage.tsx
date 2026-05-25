import { Link } from "@tanstack/react-router";
import {
  Award,
  ChevronRight,
  Globe,
  Heart,
  Shield,
  Users,
  Zap,
} from "lucide-react";

export default function AboutPage() {
  return (
    <div className="animate-fade-in">
      {/* Hero */}
      <section
        className="relative py-24 overflow-hidden"
        style={{
          backgroundColor: "#0A1628",
        }}
      >
        <div
          className="absolute top-12 right-12 h-52 w-52 rounded-full bg-brand-orange/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-6 h-40 w-40 rounded-full bg-white/5 blur-3xl"
          aria-hidden
        />
        <div className="page-container max-w-4xl text-center relative z-10">
          <p className="section-label mb-4">Our story</p>
          <h1
            className="font-display font-bold text-white mb-6"
            style={{ fontSize: "clamp(2.5rem, 6vw, 4rem)" }}
          >
            Built for Zimbabwe.
            <br />
            Built by Zimbabweans.
          </h1>
          <p className="text-slate-300 text-xl leading-relaxed max-w-2xl mx-auto">
            Hupfumi started with a clear goal: give Zimbabweans one reliable
            local platform to find work, sell products, hire professionals, and
            transact safely.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="section-label mb-3">Our mission</p>
              <h2 className="font-display font-bold text-3xl text-brand-navy dark:text-white mb-5">
                To unlock economic opportunity for every Zimbabwean
              </h2>
              <p className="text-text-secondary dark:text-slate-300 leading-relaxed mb-4">
                Whether you are a freelance developer in Harare, a farmer in
                Mashonaland selling produce, or a business in Bulawayo hiring
                staff, Hupfumi helps you connect and transact with confidence.
              </p>
              <p className="text-text-secondary dark:text-slate-300 leading-relaxed">
                We built around how Zimbabwe actually works: EcoCash payments,
                local currency awareness, identity verification for trust, and
                escrow protection so neither side ever loses money.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ["10K+", "Active members"],
                ["5K+", "Services listed"],
                ["$2M+", "USD transacted"],
                ["100%", "Secure payments"],
              ].map(([v, l]) => (
                <div key={l} className="card p-5 text-center">
                  <p className="font-display font-black text-3xl text-brand-orange">
                    {v}
                  </p>
                  <p className="text-sm text-text-secondary dark:text-slate-400 mt-1">
                    {l}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container max-w-5xl">
          <div className="text-center mb-14">
            <p className="section-label mb-3">What drives us</p>
            <h2 className="font-display font-bold text-3xl text-brand-navy dark:text-white">
              Our values
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                icon: Shield,
                title: "Safety first",
                color: "text-brand-green",
                bg: "bg-green-50 dark:bg-green-950/30",
                desc: "Every transaction is escrow-protected. KYC verification ensures you always know who you are dealing with.",
              },
              {
                icon: Users,
                title: "Community-built",
                color: "text-blue-600",
                bg: "bg-blue-50 dark:bg-blue-950/30",
                desc: "Built around Zimbabwean payment methods, culture, and business practices — not adapted from abroad.",
              },
              {
                icon: Zap,
                title: "Move fast",
                color: "text-brand-orange",
                bg: "bg-orange-50 dark:bg-orange-950/30",
                desc: "From posting a job to receiving payment — everything is designed to be fast, clear, and frictionless.",
              },
              {
                icon: Globe,
                title: "Open to all",
                color: "text-purple-600",
                bg: "bg-purple-50 dark:bg-purple-950/30",
                desc: "Any Zimbabwean, regardless of bank access or location, can participate in the digital economy.",
              },
              {
                icon: Award,
                title: "Quality signals",
                color: "text-brand-amber",
                bg: "bg-amber-50 dark:bg-amber-950/30",
                desc: "Ratings, reviews, KYC badges, and completion rates help buyers and sellers make confident decisions.",
              },
              {
                icon: Heart,
                title: "Zimbabwe first",
                color: "text-red-500",
                bg: "bg-red-50 dark:bg-red-950/30",
                desc: "Revenue stays in Zimbabwe. Our team is Zimbabwean. Our mission is Zimbabwe's economic growth.",
              },
            ].map(({ icon: Icon, title, color, bg, desc }) => (
              <div
                key={title}
                className="card p-5 hover:border-brand-orange/30 transition-all group"
              >
                <div
                  className={`w-11 h-11 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                >
                  <Icon size={20} className={color} />
                </div>
                <h3 className="font-display font-bold text-text-primary dark:text-white mb-2">
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

      {/* CTA */}
      <section className="py-20 bg-brand-orange">
        <div className="page-container text-center">
          <h2 className="font-display font-bold text-3xl text-white mb-4">
            Ready to join the movement?
          </h2>
          <p className="text-orange-50/90 mb-8">
            Create your account free and start building your future today.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-brand-orange font-bold rounded-xl hover:bg-orange-50 transition-all shadow-xl"
            >
              Create a free account <ChevronRight size={15} />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 px-6 py-3 text-white font-bold rounded-xl border-2 border-white/30 hover:bg-white/10 transition-all"
            >
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
