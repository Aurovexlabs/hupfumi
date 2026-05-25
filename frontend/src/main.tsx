import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuthStore } from "@/store/authStore";
import { bootstrapTheme } from "@/store/themeStore";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const VITE_GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined;
export const isGoogleAuthEnabled = Boolean(VITE_GOOGLE_CLIENT_ID?.trim());

const shouldRetryQuery = (failureCount: number, error: unknown) => {
  const status = (error as { response?: { status?: number } } | undefined)
    ?.response?.status;

  if (typeof status === "number") {
    if (status === 401 || status === 403 || status === 404) {
      return false;
    }
  }

  return failureCount < 2;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 10,
      retry: shouldRetryQuery,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: { retry: 0 },
  },
});

async function bootstrapAuthFromRefreshCookie() {
  const { setAuth, logout } = useAuthStore.getState();

  try {
    const refresh = await axios.post(
      "/api/v1/auth/refresh",
      {},
      { withCredentials: true, timeout: 10000 },
    );

    const accessToken = refresh.data?.data?.accessToken as string | undefined;
    if (!accessToken) {
      logout();
      return;
    }

    const me = await axios.get("/api/v1/auth/me", {
      withCredentials: true,
      timeout: 10000,
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const user = me.data?.data;
    if (!user) {
      logout();
      return;
    }

    setAuth(user, accessToken);
  } catch {
    logout();
  }
}

async function mount() {
  const root = document.getElementById("root")!;

  bootstrapTheme();
  await bootstrapAuthFromRefreshCookie();

  const providers = (children: ReactNode) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{ duration: 4000 }}
        />
      </TooltipProvider>
    </QueryClientProvider>
  );

  if (isGoogleAuthEnabled) {
    const { GoogleOAuthProvider } = await import("@react-oauth/google");
    createRoot(root).render(
      <StrictMode>
        <GoogleOAuthProvider clientId={VITE_GOOGLE_CLIENT_ID!}>
          {providers(<App queryClient={queryClient} />)}
        </GoogleOAuthProvider>
      </StrictMode>,
    );
  } else {
    createRoot(root).render(
      <StrictMode>{providers(<App queryClient={queryClient} />)}</StrictMode>,
    );
  }
}

mount();
