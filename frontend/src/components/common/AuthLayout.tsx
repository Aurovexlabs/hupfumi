import { Link } from "@tanstack/react-router";
import { type ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel - brand */}
      <div className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden bg-brand-navy text-white">
        <div
          className="absolute top-10 right-10 h-60 w-60 rounded-full bg-brand-orange/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute bottom-0 left-0 h-44 w-44 rounded-full bg-brand-green/10 blur-3xl"
          aria-hidden
        />

        <div className="relative z-10">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center shadow-orange">
              <span className="text-white font-display font-black text-xl">
                H
              </span>
            </div>
            <span className="font-display font-bold text-white text-xl">
              Hupfumi
            </span>
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <h2 className="font-display font-bold text-4xl text-white leading-tight">
            Zimbabwe's most powerful marketplace
          </h2>
          <p className="text-slate-300 text-lg leading-relaxed max-w-md">
            Join 10,000+ Zimbabweans buying, selling, and earning with full
            escrow protection.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { v: "10K+", l: "Active users" },
              { v: "$2M+", l: "Transacted" },
              { v: "5K+", l: "Services" },
              { v: "100%", l: "Secure" },
            ].map(({ v, l }) => (
              <div
                key={l}
                className="bg-white/5 rounded-2xl p-4 border border-white/10"
              >
                <p className="font-display font-bold text-2xl text-brand-orange">
                  {v}
                </p>
                <p className="text-sm text-slate-300 mt-1">{l}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-slate-400 text-sm">
            © 2025 Hupfumi (Pvt) Ltd · Harare, Zimbabwe
          </p>
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex items-center justify-center p-6 bg-surface-50 dark:bg-dark-bg">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <Link to="/" className="inline-flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-orange rounded-xl flex items-center justify-center">
                <span className="text-white font-display font-black text-lg">
                  H
                </span>
              </div>
              <span className="font-display font-bold text-brand-navy dark:text-white text-lg">
                Hupfumi
              </span>
            </Link>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
