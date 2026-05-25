import { Link } from "@tanstack/react-router";
import { ChevronRight, FileText } from "lucide-react";

const sections = [
  {
    title: "Acceptance of Terms",
    body: `By accessing or using the Hupfumi platform, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not use our platform.\n\nWe reserve the right to update these terms at any time. Continued use after changes constitutes acceptance of the updated terms.`,
  },
  {
    title: "Eligibility",
    body: `You must be at least 18 years old to use Hupfumi. By using our platform, you represent and warrant that you meet this age requirement, you have the legal capacity to enter into contracts in Zimbabwe, and all registration information you provide is accurate and complete.`,
  },
  {
    title: "User Accounts",
    body: `You are responsible for maintaining the security of your account credentials. You must not share your password with others or allow others to access your account. You are responsible for all activity that occurs under your account.\n\nWe reserve the right to terminate accounts that violate our policies, contain misleading information, or engage in fraudulent activity.`,
  },
  {
    title: "Listing Rules",
    body: `All listings must be for legal goods and services. You may not list: counterfeit or stolen goods; illegal products or services; adult content; misleading or fraudulent listings; items that infringe intellectual property rights.\n\nHupfumi reserves the right to remove any listing that violates these rules without notice.`,
  },
  {
    title: "Transactions & Escrow",
    body: `All payments are processed through our escrow system. Buyers pay funds into escrow when placing an order. Funds are released to sellers only after the buyer confirms satisfactory completion.\n\nA platform fee of 7% (or as displayed on your plan) is deducted from each successful transaction. This fee is non-refundable except in cases of platform error.`,
  },
  {
    title: "Dispute Resolution",
    body: `If a buyer and seller cannot resolve a dispute, either party may escalate to Hupfumi for mediation. Our moderation team will review the evidence and make a binding decision within 7 business days.\n\nHupfumi's decision in disputes is final. We will not be liable for outcomes of disputes resolved by our mediation team acting in good faith.`,
  },
  {
    title: "Prohibited Conduct",
    body: `You agree not to: manipulate reviews or ratings; use automated tools to access our platform; circumvent our payment system; harass or abuse other users; reverse-engineer our platform; use our platform for money laundering or other illegal financial activities.\n\nViolation of these rules may result in immediate account suspension and referral to law enforcement.`,
  },
  {
    title: "Limitation of Liability",
    body: `To the maximum extent permitted by Zimbabwean law, Hupfumi shall not be liable for any indirect, incidental, or consequential damages arising from your use of our platform.\n\nOur maximum liability to you for any cause shall not exceed the fees you paid to us in the 12 months preceding the claim.`,
  },
];

export default function TermsPage() {
  return (
    <div className="animate-fade-in">
      <section className="py-16 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-navy/5 dark:bg-dark-card rounded-xl flex items-center justify-center">
              <FileText size={20} className="text-brand-navy dark:text-white" />
            </div>
            <p className="section-label">Legal</p>
          </div>
          <h1 className="font-display font-bold text-3xl text-brand-navy dark:text-white mb-3">
            Terms of Service
          </h1>
          <p className="text-text-secondary dark:text-slate-400">
            Last updated: 1 January 2025 · Governing law: Zimbabwe
          </p>
          <p className="text-text-secondary dark:text-slate-400 mt-3 text-sm">
            These terms explain your rights, responsibilities, and the rules for
            using Hupfumi.
          </p>
        </div>
      </section>

      <section className="py-10 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-3xl">
          <div className="card p-5 mb-10">
            <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-3">
              Contents
            </p>
            <ul className="space-y-1.5">
              {sections.map(({ title }, i) => (
                <li key={i}>
                  <a
                    href={`#t${i}`}
                    className="flex items-center gap-2 text-sm text-text-secondary dark:text-slate-300 hover:text-brand-orange transition-colors"
                  >
                    <ChevronRight
                      size={12}
                      className="text-brand-orange shrink-0"
                    />
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-10">
            {sections.map(({ title, body }, i) => (
              <div key={i} id={`t${i}`} className="scroll-mt-24">
                <h2 className="font-display font-bold text-xl text-brand-navy dark:text-white mb-4">
                  {i + 1}. {title}
                </h2>
                {body.split("\n\n").map((p, j) => (
                  <p
                    key={j}
                    className="text-text-secondary dark:text-slate-300 leading-relaxed mb-3 text-sm"
                  >
                    {p}
                  </p>
                ))}
              </div>
            ))}
          </div>
          <div className="border-t border-surface-200 dark:border-dark-border mt-12 pt-8 text-center">
            <p className="text-sm text-text-tertiary dark:text-slate-500 mb-3">
              Questions about our terms?
            </p>
            <Link to="/contact" className="btn-primary">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
