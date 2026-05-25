import { clsx, type ClassValue } from "clsx";
import { format, formatDistanceToNowStrict } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function toDate(value: Date | string | number | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatCurrency(
  value: number | string | null | undefined,
  currency = "USD",
): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCompact(
  value: number | string | null | undefined,
): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(
  value: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  const date = toDate(value);
  if (!date) return "-";
  if (options) return new Intl.DateTimeFormat("en-US", options).format(date);
  return format(date, "dd MMM yyyy");
}

export function formatRelativeTime(
  value: Date | string | number | null | undefined,
): string {
  const date = toDate(value);
  if (!date) return "just now";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "U";
  const parts = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return parts || "U";
}

export function getOrderStatusColor(status: string | null | undefined): string {
  const normalized = (status ?? "").toLowerCase();
  if (["pending", "awaiting_payment", "in_progress"].includes(normalized)) {
    return "badge-amber";
  }
  if (["completed", "delivered", "paid", "success"].includes(normalized)) {
    return "badge-green";
  }
  if (
    ["cancelled", "canceled", "failed", "disputed", "refunded"].includes(
      normalized,
    )
  ) {
    return "badge-red";
  }
  return "badge-gray";
}

export const storage = {
  get<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw == null) return fallback;
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  },
  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore quota/private-mode errors and preserve app flow.
    }
  },
  remove(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage removal failures.
    }
  },
};

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy copy approach.
    }
  }

  if (typeof document === "undefined") return false;

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
}

export async function shareOrCopyLink(options: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url =
    options.url || (typeof window !== "undefined" ? window.location.href : "");

  if (!url) return "failed";

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function"
  ) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url,
      });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled";
      }
      // Fallback to copy for other share failures.
    }
  }

  const copied = await copyTextToClipboard(url);
  return copied ? "copied" : "failed";
}
