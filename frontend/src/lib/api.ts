import { useAuthStore } from "@/store/authStore";
import axios from "axios";
import { toast } from "sonner";

const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post("/api/v1/auth/refresh", {}, { withCredentials: true })
      .then((res) => {
        const nextToken = res.data?.data?.accessToken as string | undefined;
        if (nextToken) {
          useAuthStore.getState().setAccessToken(nextToken);
          return nextToken;
        }
        return null;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const msg =
      err.response?.data?.message ??
      err.response?.data?.error ??
      err.message ??
      "Something went wrong";
    const status = err.response?.status;
    const original = err.config as
      | (typeof err.config & { _retry?: boolean })
      | undefined;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      const nextToken = await refreshAccessToken();
      if (nextToken) {
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${nextToken}`;
        return api.request(original);
      }

      useAuthStore.getState().logout();
      if (typeof window !== "undefined") {
        const path = window.location.pathname;
        const publicPaths = [
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
        ];

        if (!publicPaths.some((p) => path.startsWith(p))) {
          window.dispatchEvent(new CustomEvent("hupfumi:auth-expired"));
        }
      }
    }

    if (status !== 401 && status !== 404) {
      toast.error(msg, { duration: 4000 });
    }
    return Promise.reject(err);
  },
);

export default api;
