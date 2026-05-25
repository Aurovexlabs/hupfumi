import { Spinner } from "@/components/common/LoadingScreen";
import { useForgotPassword } from "@/hooks/useApi";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Mail } from "lucide-react";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = useForgotPassword();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    try {
      await forgot.mutateAsync({ email });
      setSent(true);
    } catch {}
  };

  if (sent)
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-brand-green" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-3">
          Check your email
        </h1>
        <p className="text-text-secondary dark:text-slate-400 mb-2">
          We sent a password reset link to:
        </p>
        <p className="font-semibold text-text-primary dark:text-white mb-6">
          {email}
        </p>
        <p className="text-sm text-text-tertiary dark:text-slate-500 mb-6">
          Did not receive it? Check your spam folder or try again in a few
          minutes.
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="btn-secondary w-full mb-3"
        >
          Use a different email
        </button>
        <Link
          to="/login"
          className="btn-ghost w-full flex justify-center items-center gap-2 text-sm"
        >
          <ArrowLeft size={14} /> Back to login
        </Link>
      </div>
    );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-2">
          Reset your password
        </h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm">
          Enter your email and we will send a secure password reset link.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Email address</label>
          <div className="relative">
            <Mail
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="email"
              className="input pl-9"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>
        </div>
        <button
          type="submit"
          className="btn-primary w-full py-3"
          disabled={forgot.isPending || !email.trim()}
        >
          {forgot.isPending ? (
            <>
              <Spinner size={14} className="text-white" />
              Sending…
            </>
          ) : (
            "Send reset link"
          )}
        </button>
      </form>

      <div className="card p-4 mt-5 bg-surface-50 dark:bg-dark-hover border-surface-200 dark:border-dark-border">
        <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-2">
          What happens next
        </p>
        <ol className="space-y-1.5 text-xs text-text-secondary dark:text-slate-400">
          <li>1. You receive a secure reset link at your email address.</li>
          <li>2. Open the link and choose a new password.</li>
          <li>3. Sign in again to continue using your account.</li>
        </ol>
        <p className="text-xs text-text-tertiary dark:text-slate-500 mt-2">
          For security, reset links can expire. If a link fails, request a new
          one.
        </p>
      </div>

      <Link
        to="/login"
        className="flex items-center justify-center gap-2 text-sm text-text-secondary dark:text-slate-400 hover:text-text-primary dark:hover:text-white mt-6 transition-colors"
      >
        <ArrowLeft size={14} /> Back to login
      </Link>
    </div>
  );
}
