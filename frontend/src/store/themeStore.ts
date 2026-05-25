import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark";
interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const STORAGE_KEY = "hupfumi-theme";

const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return window.matchMedia?.("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }

    const parsed = JSON.parse(raw) as { state?: { theme?: string } };
    return parsed.state?.theme === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
};

const applyTheme = (t: Theme) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle("dark", t === "dark");
  document.documentElement.style.colorScheme = t;
};

export const bootstrapTheme = () => {
  applyTheme(getStoredTheme());
};

bootstrapTheme();

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: getStoredTheme(),
      setTheme: (theme) => {
        applyTheme(theme);
        set({ theme });
      },
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        applyTheme(next);
        set({ theme: next });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({ theme: state.theme }),
      onRehydrateStorage: () => (state, error) => {
        if (!error && state) {
          applyTheme(state.theme);
        }
      },
    },
  ),
);
