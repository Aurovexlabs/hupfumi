import { Input } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import { useLogin, useLoginTwoFactor } from "@/hooks/useApi";
import { isGoogleAuthEnabled } from "@/main";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Eye, EyeOff, Lock, Mail, Shield } from "lucide-react";
import type { FormEvent } from "react";
import { lazy, Suspense, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const GoogleButton = lazy(() => import("@/components/common/GoogleButton"));

const schema = z.object({
  email: z.string().trim().min(3, "Enter your email or username"),
  password: z.string().min(1, "Password required"),
});

type LoginFormValues = z.infer<typeof schema>;

type TwoFactorChallenge = {
  challengeToken: string;
  method: string;
  expiresInSeconds?: number;
  email: string;
};

const getRedirectPath = () => {
  if (typeof window === "undefined") return "/dashboard";
  const redirect = new URLSearchParams(window.location.search).get("redirect");

  if (redirect && redirect.startsWith("/")) return redirect;
  return "/dashboard";
};

export default function LoginPage() {
  const login = useLogin();
  const loginTwoFactor = useLoginTwoFactor();
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactor, setTwoFactor] = useState<TwoFactorChallenge | null>(null);
  const [otp, setOtp] = useState("");

  const redirectPath = useMemo(() => getRedirectPath(), []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: LoginFormValues) => {
    const res = await login.mutateAsync({ ...data, rememberMe });
    const payload = res?.data;

    if (payload?.requiresTwoFactor) {
      setTwoFactor({
        challengeToken: String(payload.challengeToken || ""),
        method: String(payload.method || "email"),
        expiresInSeconds:
          typeof payload.expiresInSeconds === "number"
            ? payload.expiresInSeconds
            : undefined,
        email: data.email,
      });
      return;
    }

    window.location.assign(redirectPath);
  };

  const submitTwoFactor = async (event: FormEvent) => {
    event.preventDefault();
    const code = otp.trim();
    if (!twoFactor || !/^\d{6}$/.test(code)) return;

    await loginTwoFactor.mutateAsync({
      challengeToken: twoFactor.challengeToken,
      otp: code,
    });

    window.location.assign(redirectPath);
  };

  if (twoFactor) {
    return (
      <div className="animate-fade-in">
        <div className="mb-8">
          <h1 className="font-display font-bold text-3xl text-text-primary dark:text-white mb-2">
            Two-factor verification
          </h1>
          <p className="text-text-secondary dark:text-slate-400">
            Enter the 6-digit code sent to {twoFactor.email} to finish signing
            in.
          </p>
        </div>

        <form onSubmit={submitTwoFactor} className="space-y-4" noValidate>
          <Input
            label="Authentication code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            value={otp}
            onChange={(event) =>
              setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            leftIcon={<Shield size={15} className="text-text-tertiary" />}
          />

          <button
            type="submit"
            className="btn-primary w-full py-3 text-base"
            disabled={loginTwoFactor.isPending || otp.trim().length !== 6}
            aria-busy={loginTwoFactor.isPending}
          >
            {loginTwoFactor.isPending ? (
              <>
                <Spinner size={16} className="text-white" /> Verifying…
              </>
            ) : (
              "Verify and continue"
            )}
          </button>

          <button
            type="button"
            className="btn-secondary w-full py-3 text-base"
            onClick={() => {
              setTwoFactor(null);
              setOtp("");
            }}
            disabled={loginTwoFactor.isPending}
          >
            Use different account
          </button>

          {twoFactor.expiresInSeconds ? (
            <p className="text-xs text-text-tertiary dark:text-slate-500 text-center">
              Code expires in about{" "}
              {Math.max(1, Math.floor(twoFactor.expiresInSeconds / 60))}{" "}
              minute(s).
            </p>
          ) : null}
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text-primary dark:text-white mb-2">
          Welcome back
        </h1>
        <p className="text-text-secondary dark:text-slate-400">
          Sign in to manage orders, payouts, listings, and messages.
        </p>
      </div>

      {isGoogleAuthEnabled && (
        <div className="mb-6">
          <Suspense
            fallback={
              <div className="btn-secondary w-full py-3">
                <Spinner size={16} className="text-text-tertiary" />
              </div>
            }
          >
            <GoogleButton />
          </Suspense>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-px bg-surface-200 dark:bg-dark-border" />
            <span className="text-xs text-text-tertiary dark:text-slate-500 font-medium">
              or continue with email
            </span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-dark-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Email or username"
          type="text"
          placeholder="you@example.com or your_username"
          autoComplete="username"
          error={errors.email?.message}
          leftIcon={<Mail size={15} className="text-text-tertiary" />}
          {...register("email")}
        />
        <div>
          <Input
            label="Password"
            type={showPass ? "text" : "password"}
            placeholder="••••••••"
            autoComplete="current-password"
            error={errors.password?.message}
            leftIcon={<Lock size={15} className="text-text-tertiary" />}
            {...register("password")}
          />
          <button
            type="button"
            onClick={() => setShowPass((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
            style={{
              position: "relative",
              float: "right",
              marginTop: "-28px",
              marginRight: "8px",
            }}
            aria-label={showPass ? "Hide password" : "Show password"}
          >
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 accent-brand-orange"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span className="text-sm text-text-secondary dark:text-slate-400">
              Remember me
            </span>
          </label>
          <Link
            to="/forgot-password"
            className="text-sm text-brand-orange hover:underline font-medium"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          className="btn-primary w-full py-3 text-base"
          disabled={login.isPending}
          aria-busy={login.isPending}
        >
          {login.isPending ? (
            <>
              <Spinner size={16} className="text-white" /> Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <div className="card p-4 bg-surface-50 dark:bg-dark-hover border-surface-200 dark:border-dark-border">
          <p className="text-xs font-semibold text-text-tertiary dark:text-slate-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <Shield size={12} className="text-brand-green" /> Security and trust
          </p>
          <ul className="space-y-1.5 text-xs text-text-secondary dark:text-slate-400">
            <li className="flex items-start gap-2">
              <CheckCircle
                size={12}
                className="text-brand-green mt-0.5 shrink-0"
              />
              Escrow protection applies to every qualifying transaction.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle
                size={12}
                className="text-brand-green mt-0.5 shrink-0"
              />
              KYC-verified accounts receive higher trust visibility.
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle
                size={12}
                className="text-brand-green mt-0.5 shrink-0"
              />
              Account activity and payout actions are monitored for fraud
              protection.
            </li>
          </ul>
        </div>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary dark:text-slate-400">
        Do not have an account?{" "}
        <Link
          to="/register"
          className="text-brand-orange font-semibold hover:underline"
        >
          Create a free account
        </Link>
      </p>
    </div>
  );
}
