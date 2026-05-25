import {
  AlertTriangle,
  CheckCircle,
  Eye,
  Key,
  Lock,
  RefreshCw,
  Server,
  Shield,
} from "lucide-react";

const MEASURES = [
  {
    icon: Lock,
    title: "AES-256 Encryption",
    desc: "All sensitive data — including KYC documents, payment information, and personal records — is encrypted at rest using AES-256, the same standard used by banks and governments.",
  },
  {
    icon: Shield,
    title: "TLS 1.3 in Transit",
    desc: "All data transmitted between your browser and our servers is protected by TLS 1.3. Every connection is encrypted — no plaintext data ever crosses our network.",
  },
  {
    icon: Key,
    title: "bcrypt Password Hashing",
    desc: "We never store passwords in plaintext. All passwords are hashed using bcrypt with a work factor of 12, making them computationally infeasible to reverse.",
  },
  {
    icon: RefreshCw,
    title: "JWT Token Rotation",
    desc: "We use short-lived access tokens (15 minutes) paired with secure, HTTP-only refresh tokens (7 days). Tokens are rotated on every refresh cycle, limiting exposure if intercepted.",
  },
  {
    icon: Eye,
    title: "KYC Identity Verification",
    desc: "Every verified seller has had their identity confirmed by our compliance team. Government-issued ID documents are reviewed and stored encrypted, accessible only to authorised staff.",
  },
  {
    icon: Server,
    title: "Escrow Payment Protection",
    desc: "Funds never transfer directly between users. Buyer payments are held in our escrow system until order completion is confirmed, protecting both parties from fraud.",
  },
  {
    icon: AlertTriangle,
    title: "Rate Limiting",
    desc: "All API endpoints are rate-limited to prevent brute-force attacks. Login attempts, OTP submissions, and sensitive operations are subject to strict limits with automatic lockout.",
  },
  {
    icon: CheckCircle,
    title: "Input Sanitisation",
    desc: "All user inputs are sanitised server-side to prevent SQL injection, NoSQL injection, XSS, and other common attack vectors. We use Zod schema validation on all endpoints.",
  },
];

export default function SecurityPage() {
  return (
    <div className="animate-fade-in">
      <section
        className="relative py-24 overflow-hidden"
        style={{
          backgroundColor: "#0A1628",
        }}
      >
        <div
          className="absolute top-0 right-0 w-80 h-80 rounded-full bg-brand-green/10 blur-3xl pointer-events-none"
          aria-hidden
        />
        <div className="page-container text-center relative z-10 max-w-3xl">
          <div className="w-16 h-16 bg-brand-green/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Shield size={32} className="text-brand-green" />
          </div>
          <p className="section-label mb-4">Security</p>
          <h1
            className="font-display font-bold text-white mb-5"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)" }}
          >
            Your safety is our foundation
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Security is built into every step, from sign-in and identity checks
            to escrow and payouts.
          </p>
        </div>
      </section>

      <section className="py-20 bg-white dark:bg-dark-surface">
        <div className="page-container max-w-5xl">
          <div className="text-center mb-14">
            <p className="section-label mb-3">How we protect you</p>
            <h2 className="section-title">Bank-grade security measures</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {MEASURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="card p-6 hover:border-brand-green/30 transition-all group"
              >
                <div className="w-11 h-11 bg-green-50 dark:bg-green-950/30 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon size={20} className="text-brand-green" />
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

      <section className="py-16 bg-surface-50 dark:bg-dark-bg">
        <div className="page-container max-w-2xl text-center">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={20} className="text-brand-orange" />
          </div>
          <h2 className="font-display font-bold text-xl text-brand-navy dark:text-white mb-3">
            Found a vulnerability?
          </h2>
          <p className="text-text-secondary dark:text-slate-400 text-sm leading-relaxed mb-5">
            We take security reports seriously. If you discover a vulnerability
            in our platform, please report it responsibly to our security team.
            We commit to acknowledging your report within 24 hours.
          </p>
          <a href="mailto:security@hupfumi.co.zw" className="btn-primary">
            Report a vulnerability
          </a>
        </div>
      </section>
    </div>
  );
}
