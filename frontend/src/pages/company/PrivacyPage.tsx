import { Link } from "@tanstack/react-router";
import { ChevronRight, Shield } from "lucide-react";

const sections = [
  {
    title: "Information We Collect",
    body: `We collect information you provide directly to us when you create an account, post listings, place orders, or communicate with us. This includes your name, email address, username, password, profile information, payment details, and identification documents for KYC verification.\n\nWe also automatically collect certain usage information when you use our platform, including your IP address, browser type, device information, pages visited, and interactions with listings.`,
  },
  {
    title: "How We Use Your Information",
    body: `We use the information we collect to operate, maintain, and improve our platform; process transactions and send related communications; verify your identity through KYC processes; send marketing communications (with your consent); respond to your comments and questions; and comply with legal obligations.\n\nWe do not sell your personal information to third parties. We share your information only as described in this policy.`,
  },
  {
    title: "Data Sharing",
    body: `We share your information with other users as necessary to facilitate marketplace transactions (e.g., your name and contact info with your buyer/seller); service providers who assist us in operating our platform (e.g., payment processors, cloud storage); and law enforcement when required by applicable law.\n\nWhen you create a public listing, your username, profile photo, and listing information are visible to all users.`,
  },
  {
    title: "Data Security",
    body: `We implement industry-standard security measures to protect your information, including AES-256 encryption for sensitive data, TLS encryption for data in transit, bcrypt hashing for passwords, JWT-based authentication with secure refresh token rotation, and regular security audits.\n\nNo method of transmission over the internet is 100% secure. We cannot guarantee absolute security, but we are committed to protecting your data using best practices.`,
  },
  {
    title: "Your Rights",
    body: `You have the right to access the personal information we hold about you; request correction of inaccurate information; request deletion of your information (subject to legal retention requirements); withdraw consent for marketing communications at any time; and export your data in a portable format.\n\nTo exercise these rights, contact us at privacy@hupfumi.co.zw.`,
  },
  {
    title: "Cookies",
    body: `We use essential cookies to operate our platform (authentication tokens, session management), and optional analytics cookies to understand how users interact with our services. You can control cookie preferences through your browser settings.\n\nWe do not use advertising cookies or share data with ad networks.`,
  },
  {
    title: "Children's Privacy",
    body: `Our platform is not intended for individuals under 18 years of age. We do not knowingly collect personal information from minors. If you become aware that a minor has provided us with personal information, please contact us and we will take appropriate action.`,
  },
  {
    title: "Changes to This Policy",
    body: `We may update this privacy policy from time to time. We will notify you of significant changes via email or a prominent notice on our platform at least 30 days before the changes take effect. Continued use of our platform after the effective date constitutes acceptance of the updated policy.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="animate-fade-in">
      <section className="py-16 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-950/30 rounded-xl flex items-center justify-center">
              <Shield size={20} className="text-blue-600" />
            </div>
            <p className="section-label">Legal</p>
          </div>
          <h1 className="font-display font-bold text-3xl text-brand-navy dark:text-white mb-3">
            Privacy Policy
          </h1>
          <p className="text-text-secondary dark:text-slate-400">
            Last updated: 1 January 2025
          </p>
          <p className="text-text-secondary dark:text-slate-400 mt-4 leading-relaxed">
            This policy explains how Hupfumi (Pvt) Ltd ("we", "our", or "us")
            collects, uses, stores, and protects your personal information when
            you use our marketplace platform.
          </p>
        </div>
      </section>

      <section className="py-10 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-3xl">
          {/* TOC */}
          <div className="card p-5 mb-10">
            <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-3">
              Contents
            </p>
            <ul className="space-y-1.5">
              {sections.map(({ title }, i) => (
                <li key={i}>
                  <a
                    href={`#s${i}`}
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
              <div key={i} id={`s${i}`} className="scroll-mt-24">
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
            <p className="text-sm text-text-tertiary dark:text-slate-500">
              Questions about this policy?
            </p>
            <Link to="/contact" className="btn-primary mt-3 inline-flex">
              Contact us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
