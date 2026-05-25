import { cn } from "@/lib/utils";
import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

function getErrorMessage(error: unknown): string | undefined {
  if (!error) return undefined;
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: unknown;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, ...props }, ref) => {
    const errorMessage = getErrorMessage(error);

    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={cn(
              "input",
              leftIcon && "pl-9",
              errorMessage && "error",
              className,
            )}
            aria-invalid={!!errorMessage}
            {...props}
          />
        </div>
        {errorMessage && (
          <p className="text-xs text-red-500 mt-1" role="alert">
            {errorMessage}
          </p>
        )}
        {hint && !errorMessage && (
          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Input.displayName = "Input";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: unknown;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, className, ...props }, ref) => {
    const errorMessage = getErrorMessage(error);

    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <select
          ref={ref}
          className={cn("input", errorMessage && "error", className)}
          aria-invalid={!!errorMessage}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {errorMessage && (
          <p className="text-xs text-red-500 mt-1" role="alert">
            {errorMessage}
          </p>
        )}
      </div>
    );
  },
);
Select.displayName = "Select";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: unknown;
  hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, className, rows = 4, ...props }, ref) => {
    const errorMessage = getErrorMessage(error);

    return (
      <div className="w-full">
        {label && <label className="label">{label}</label>}
        <textarea
          ref={ref}
          rows={rows}
          className={cn(
            "input resize-y min-h-20",
            errorMessage && "error",
            className,
          )}
          aria-invalid={!!errorMessage}
          {...props}
        />
        {errorMessage && (
          <p className="text-xs text-red-500 mt-1" role="alert">
            {errorMessage}
          </p>
        )}
        {hint && !errorMessage && (
          <p className="text-xs text-text-tertiary dark:text-slate-500 mt-1">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export function Divider({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-px bg-surface-200 dark:bg-dark-border" />
      {label && (
        <span className="text-xs text-text-tertiary dark:text-slate-500 font-medium">
          {label}
        </span>
      )}
      <div className="flex-1 h-px bg-surface-200 dark:bg-dark-border" />
    </div>
  );
}
