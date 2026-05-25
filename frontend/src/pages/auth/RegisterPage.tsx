import { Input, Select } from "@/components/common/FormComponents";
import { Spinner } from "@/components/common/LoadingScreen";
import { useRegister } from "@/hooks/useApi";
import { isGoogleAuthEnabled } from "@/main";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const GoogleButton = lazy(() => import("@/components/common/GoogleButton"));

const schema = z.object({
  fullName: z.string().min(2, "Full name required"),
  username: z
    .string()
    .min(3, "Min 3 characters")
    .regex(/^[a-z0-9_]+$/, "Lowercase, numbers, underscores only"),
  email: z.string().email("Valid email required"),
  password: z.string().min(8, "At least 8 characters"),
  profileType: z.enum(["individual", "freelancer", "business"]),
});

type RegisterFormValues = z.infer<typeof schema>;

type PasswordRule = {
  label: string;
  shortLabel: string;
  pass: boolean;
};

type PasswordStrength = {
  score: number;
  label: string;
  barClass: string;
  textClass: string;
  rules: PasswordRule[];
};

function evaluatePasswordStrength(password: string): PasswordStrength {
  const rules: PasswordRule[] = [
    {
      label: "At least 8 characters",
      shortLabel: "8+",
      pass: password.length >= 8,
    },
    {
      label: "At least one uppercase letter",
      shortLabel: "A-Z",
      pass: /[A-Z]/.test(password),
    },
    {
      label: "At least one lowercase letter",
      shortLabel: "a-z",
      pass: /[a-z]/.test(password),
    },
    {
      label: "At least one number",
      shortLabel: "0-9",
      pass: /\d/.test(password),
    },
    {
      label: "At least one special character",
      shortLabel: "!@#",
      pass: /[^A-Za-z0-9]/.test(password),
    },
  ];

  const score = rules.filter((rule) => rule.pass).length;

  if (!password) {
    return {
      score,
      label: "Start typing your password",
      barClass: "bg-surface-200 dark:bg-dark-border",
      textClass: "text-text-tertiary dark:text-slate-500",
      rules,
    };
  }

  if (score <= 2) {
    return {
      score,
      label: "Weak",
      barClass: "bg-red-500",
      textClass: "text-red-500",
      rules,
    };
  }

  if (score === 3) {
    return {
      score,
      label: "Fair",
      barClass: "bg-amber-500",
      textClass: "text-amber-500",
      rules,
    };
  }

  if (score === 4) {
    return {
      score,
      label: "Good",
      barClass: "bg-blue-500",
      textClass: "text-blue-500",
      rules,
    };
  }

  return {
    score,
    label: "Strong",
    barClass: "bg-brand-green",
    textClass: "text-brand-green",
    rules,
  };
}

export default function RegisterPage() {
  const registerMut = useRegister();
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { profileType: "individual" },
  });

  const password = watch("password") || "";
  const passwordStrength = evaluatePasswordStrength(password);
  const passwordFillWidth = `${Math.max(6, (passwordStrength.score / 5) * 100)}%`;

  const onSubmit = async (data: RegisterFormValues) => {
    try {
      await registerMut.mutateAsync(data);
      toast.success("Account created! Please verify your email.");
      navigate({ to: "/verify-email" });
    } catch {}
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-display font-bold text-3xl text-text-primary dark:text-white mb-2">
          Create your account
        </h1>
        <p className="text-text-secondary dark:text-slate-400">
          Join Zimbabweans who hire, sell, and grow safely on Hupfumi.
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
            <span className="text-xs text-text-tertiary font-medium">
              or sign up with email
            </span>
            <div className="flex-1 h-px bg-surface-200 dark:bg-dark-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Input
          label="Full name"
          placeholder="Tanaka Moyo"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />
        <Input
          label="Username"
          placeholder="tanaka_moyo"
          hint="Lowercase letters, numbers, underscores only"
          error={errors.username?.message}
          {...register("username")}
        />
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <div className="rounded-xl border border-surface-200 dark:border-dark-border p-2.5 bg-surface-50 dark:bg-dark-hover">
          <div className="flex items-center gap-3">
            <p className="text-[11px] font-semibold text-text-secondary dark:text-slate-300 whitespace-nowrap">
              Password strength
            </p>
            <div className="flex-1 h-1.5 rounded-full bg-surface-200 dark:bg-dark-border overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${passwordStrength.barClass}`}
                style={{ width: passwordFillWidth }}
              />
            </div>
            <p
              className={`text-[11px] font-semibold whitespace-nowrap ${passwordStrength.textClass}`}
            >
              {passwordStrength.label}
            </p>
          </div>
          <ul className="mt-2 flex flex-wrap items-center gap-1.5">
            {passwordStrength.rules.map((rule) => (
              <li
                key={rule.label}
                title={rule.label}
                className={`text-[10px] px-1.5 py-0.5 rounded-full border transition-colors ${
                  rule.pass
                    ? "text-brand-green border-brand-green/30 bg-brand-green/10"
                    : "text-text-tertiary dark:text-slate-500 border-surface-300 dark:border-slate-700"
                }`}
              >
                {rule.shortLabel}
              </li>
            ))}
          </ul>
        </div>
        <Select
          label="Account type"
          options={[
            {
              value: "individual",
              label: "Individual — buying for personal use",
            },
            {
              value: "freelancer",
              label: "Freelancer — offering skills & services",
            },
            { value: "business", label: "Business — company account" },
          ]}
          error={errors.profileType?.message}
          {...register("profileType")}
        />

        <p className="text-xs text-text-tertiary dark:text-slate-500">
          By creating an account you agree to our{" "}
          <Link to="/terms" className="text-brand-orange hover:underline">
            Terms
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="text-brand-orange hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <button
          type="submit"
          className="btn-primary w-full py-3 text-base"
          disabled={registerMut.isPending}
          aria-busy={registerMut.isPending}
        >
          {registerMut.isPending ? (
            <>
              <Spinner size={16} className="text-white" /> Creating account…
            </>
          ) : (
            "Create free account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-text-secondary dark:text-slate-400">
        Already have an account?{" "}
        <Link
          to="/login"
          className="text-brand-orange font-semibold hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
