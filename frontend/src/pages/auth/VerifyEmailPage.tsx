import { Input } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import { useResendVerifyEmail, useVerifyEmail } from "@/hooks/useApi";
import { useAuthStore } from "@/store/authStore";
import { Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle, Mail } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerifyEmailPage() {
  const navigate = useNavigate();
  const verify = useVerifyEmail();
  const resendVerify = useResendVerifyEmail();
  const { setAuth, user } = useAuthStore();
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [contactEmail, setContactEmail] = useState(user?.email ?? "");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [done, setDone] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const code = otp.join("");
  const isComplete = code.length === 6;

  const handleInput = (i: number, val: string) => {
    const v = val.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      inputs.current[i - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && i > 0) inputs.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (text.length) {
      setOtp([...text.split(""), ...Array(6 - text.length).fill("")]);
      inputs.current[Math.min(text.length, 5)]?.focus();
    }
    e.preventDefault();
  };

  useEffect(() => {
    if (isComplete) submit();
  }, [code]);

  useEffect(() => {
    if (user?.email) {
      setContactEmail(user.email);
    }
  }, [user?.email]);

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = window.setInterval(() => {
      setResendCountdown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [resendCountdown]);

  const submit = async () => {
    if (!isComplete) return;

    const normalizedEmail = contactEmail.trim().toLowerCase();
    if (!user?.email && !EMAIL_PATTERN.test(normalizedEmail)) {
      toast.error("Enter the email linked to this verification code.");
      return;
    }

    try {
      const res = (await verify.mutateAsync(
        user?.email ? { otp: code } : { otp: code, email: normalizedEmail },
      )) as any;
      if (res?.data?.user && res?.data?.accessToken) {
        setAuth(res.data.user, res.data.accessToken);
      }
      setDone(true);
      setTimeout(() => navigate({ to: "/dashboard" }), 2000);
    } catch {
      setOtp(["", "", "", "", "", ""]);
      inputs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    const normalizedEmail = contactEmail.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      toast.error("Enter a valid email address first.");
      return;
    }

    const response = (await resendVerify.mutateAsync({
      email: normalizedEmail,
    })) as any;
    const cooldownSeconds = Number(response?.data?.cooldownSeconds);

    setResendCountdown(
      Number.isFinite(cooldownSeconds) && cooldownSeconds > 0
        ? cooldownSeconds
        : 60,
    );

    if (response?.data?.alreadyVerified) {
      toast.success("Email already verified. Sign in to continue.");
      return;
    }

    toast.success("Verification code sent. Check your inbox.");
  };

  if (done)
    return (
      <div className="animate-fade-in text-center">
        <div className="w-16 h-16 bg-green-50 dark:bg-green-950/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={32} className="text-brand-green" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-2">
          Email verified!
        </h1>
        <p className="text-text-secondary dark:text-slate-400">
          Taking you to your dashboard…
        </p>
      </div>
    );

  return (
    <div className="animate-fade-in">
      <div className="mb-8 text-center">
        <div className="w-14 h-14 bg-brand-orange/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail size={24} className="text-brand-orange" />
        </div>
        <h1 className="font-display font-bold text-2xl text-text-primary dark:text-white mb-2">
          Check your email
        </h1>
        <p className="text-text-secondary dark:text-slate-400 text-sm">
          {contactEmail
            ? `We sent a 6-digit code to ${contactEmail}. Enter it below.`
            : "Enter your account email and the 6-digit code to verify your account."}
        </p>
      </div>

      <div className="mb-5">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          disabled={verify.isPending}
        />
      </div>

      <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleInput(i, e.target.value)}
            onKeyDown={(e) => handleKey(i, e)}
            className="w-12 h-14 text-center text-xl font-bold rounded-xl border-2 bg-surface-0 dark:bg-dark-card text-text-primary dark:text-white outline-none transition-all focus:border-brand-orange focus:shadow-focus"
            style={{ borderColor: digit ? "var(--color-brand-orange)" : "" }}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        className="btn-primary w-full py-3"
        disabled={!isComplete || verify.isPending}
      >
        {verify.isPending ? (
          <>
            <Spinner size={14} className="text-white" />
            Verifying…
          </>
        ) : (
          "Verify email"
        )}
      </button>

      <div className="card p-4 mt-5 bg-surface-50 dark:bg-dark-hover border-surface-200 dark:border-dark-border">
        <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-2">
          Why verification matters
        </p>
        <ul className="space-y-1.5 text-xs text-text-secondary dark:text-slate-400">
          <li>Protects your account from unauthorized access.</li>
          <li>Unlocks full marketplace features and notifications.</li>
          <li>Improves trust when buying, selling, and messaging.</li>
        </ul>
      </div>

      <div className="mt-5 text-center">
        <p className="text-sm text-text-tertiary dark:text-slate-500">
          Did not receive the code?{" "}
          <button
            type="button"
            onClick={handleResend}
            className="text-brand-orange hover:underline font-medium"
            disabled={resendVerify.isPending || resendCountdown > 0}
          >
            {resendVerify.isPending
              ? "Sending..."
              : resendCountdown > 0
                ? `Resend in ${resendCountdown}s`
                : "Resend code"}
          </button>
        </p>
      </div>
      <Link
        to="/login"
        className="flex justify-center mt-3 text-sm text-text-tertiary dark:text-slate-500 hover:text-text-secondary dark:hover:text-slate-400 transition-colors"
      >
        ← Back to login
      </Link>
    </div>
  );
}
