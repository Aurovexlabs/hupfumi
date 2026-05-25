import { Spinner } from "@/components/common/LoadingScreen";
import { useResetPassword } from "@/hooks/useApi";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Eye, EyeOff, Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const reset = useResetPassword();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
      setTimeout(() => navigate({ to: "/login" }), 3000);
    } catch {}
  };

  if (!token)
    return (
      <div className="animate-fade-in text-center">
        <p className="text-text-secondary dark:text-slate-400 mb-4">
          Invalid or expired reset link.
        </p>
        <Link to="/forgot-password" className="btn-primary">
          Request a new link
        </Link>
      </div>
    );

  if (done)
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-brand-green" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-3">
          Password updated!
        </h1>
        <p className="text-text-secondary dark:text-slate-400 mb-4">
          You will be redirected to sign in in a moment.
        </p>
        <Link to="/login" className="btn-primary">
          Sign in now
        </Link>
      </div>
    );

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-2">
          Set new password
        </h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm">
          Choose a strong password with at least 8 characters.
        </p>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">New password</label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type={showPass ? "text" : "password"}
              className="input pl-9 pr-10"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPass((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
            >
              {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4].map((n) => (
                  <div
                    key={n}
                    className={`h-1 flex-1 rounded-full transition-colors ${password.length >= n * 2 ? (n <= 1 ? "bg-red-400" : n <= 2 ? "bg-brand-amber" : n <= 3 ? "bg-blue-500" : "bg-brand-green") : "bg-surface-200 dark:bg-dark-border"}`}
                  />
                ))}
              </div>
              <p className="text-xs text-text-tertiary dark:text-slate-500">
                {password.length < 8
                  ? "Too short"
                  : password.length < 12
                    ? "Fair"
                    : "Strong"}
              </p>
            </div>
          )}
        </div>
        <div>
          <label className="label">Confirm password</label>
          <div className="relative">
            <Lock
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
            />
            <input
              type="password"
              className={`input pl-9 ${confirm && confirm !== password ? "error" : ""}`}
              placeholder="Repeat password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>
          {confirm && confirm !== password && (
            <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
          )}
        </div>

        <div className="card p-4 bg-surface-50 dark:bg-dark-hover border-surface-200 dark:border-dark-border">
          <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-2">
            Password tips
          </p>
          <ul className="space-y-1.5 text-xs text-text-secondary dark:text-slate-400">
            <li>Use at least 12 characters where possible.</li>
            <li>Mix letters, numbers, and symbols for better protection.</li>
            <li>Avoid reusing passwords from other sites or apps.</li>
          </ul>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3"
          disabled={reset.isPending || !password || !confirm}
        >
          {reset.isPending ? (
            <>
              <Spinner size={14} className="text-white" />
              Updating…
            </>
          ) : (
            "Update password"
          )}
        </button>
      </form>
    </div>
  );
}
