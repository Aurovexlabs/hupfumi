import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

type QueryParamValue = string | number | boolean | null | undefined;
type QueryParams = Record<string, QueryParamValue>;

const toStableParams = (params: QueryParams = {}) => {
  const stable: Record<string, QueryParamValue> = {};

  Object.keys(params)
    .sort()
    .forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null && value !== "") {
        stable[key] = value;
      }
    });

  return stable;
};

// ── AUTH ──────────────────────────────────────────────────────
export const useLogin = () => {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      email: string;
      password: string;
      rememberMe?: boolean;
    }) => api.post("/auth/login", data).then((r) => r.data),
    onSuccess: (d) => {
      if (d?.data?.user && d?.data?.accessToken) {
        setAuth(d.data.user, d.data.accessToken);
        qc.clear();
      }
    },
  });
};

export const useLoginTwoFactor = () => {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { challengeToken: string; otp: string }) =>
      api.post("/auth/2fa/login", data).then((r) => r.data),
    onSuccess: (d) => {
      if (d?.data?.user && d?.data?.accessToken) {
        setAuth(d.data.user, d.data.accessToken);
        qc.clear();
      }
    },
  });
};

export const useRegister = () => {
  const { setAuth } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: any) =>
      api.post("/auth/register", data).then((r) => r.data),
    onSuccess: (d) => {
      if (d?.data?.user && d?.data?.accessToken) {
        setAuth(d.data.user, d.data.accessToken);
      }
      qc.clear();
    },
  });
};

export const useLogout = () => {
  const { logout } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post("/auth/logout").then((r) => r.data),
    onSettled: () => {
      logout();
      qc.clear();
    },
  });
};

export const useForgotPassword = () =>
  useMutation({
    mutationFn: (data: { email: string }) =>
      api.post("/auth/forgot-password", data).then((r) => r.data),
  });

export const useResetPassword = () =>
  useMutation({
    mutationFn: (data: { token: string; password: string }) =>
      api.post("/auth/reset-password", data).then((r) => r.data),
  });

export const useVerifyEmail = () =>
  useMutation({
    mutationFn: (data: { otp: string; email?: string }) =>
      api.post("/auth/verify-email", data).then((r) => r.data),
  });

export const useResendVerifyEmail = () =>
  useMutation({
    mutationFn: (data: { email: string }) =>
      api.post("/auth/verify-email/resend", data).then((r) => r.data),
  });

export const useRequestTwoFactorSetup = () =>
  useMutation({
    mutationFn: () => api.post("/auth/2fa/setup/request").then((r) => r.data),
  });

export const useConfirmTwoFactorSetup = () => {
  const { updateUser } = useAuthStore();
  return useMutation({
    mutationFn: (data: { otp: string }) =>
      api.post("/auth/2fa/setup/confirm", data).then((r) => r.data),
    onSuccess: () =>
      updateUser({ twoFactorEnabled: true, twoFactorMethod: "email" }),
  });
};

export const useRequestTwoFactorDisable = () =>
  useMutation({
    mutationFn: () => api.post("/auth/2fa/disable/request").then((r) => r.data),
  });

export const useConfirmTwoFactorDisable = () => {
  const { updateUser } = useAuthStore();
  return useMutation({
    mutationFn: (data: { otp: string; password?: string }) =>
      api.post("/auth/2fa/disable/confirm", data).then((r) => r.data),
    onSuccess: () =>
      updateUser({ twoFactorEnabled: false, twoFactorMethod: undefined }),
  });
};

// ── USER / PROFILE ────────────────────────────────────────────
export const useProfile = (username: string) =>
  useQuery({
    queryKey: ["profile", username],
    queryFn: () => api.get(`/users/${username}`).then((r) => r.data.data),
    enabled: !!username,
  });

export const useUpdateProfile = () => {
  const { updateUser } = useAuthStore();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch("/users/me", data).then((r) => r.data),
    onSuccess: (d) => {
      updateUser(d.data);
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Profile updated!");
    },
  });
};

export const useDeleteAccount = () => {
  const { logout } = useAuthStore();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: { confirmation: "DELETE"; password?: string }) =>
      api.delete("/users/me", { data }).then((r) => r.data),
    onSuccess: () => {
      logout();
      qc.clear();
    },
  });
};

export const useUserActivity = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["user-activity", stableParams],
    queryFn: () =>
      api
        .get("/users/me/activity", { params: stableParams })
        .then((r) => r.data),
  });
};

export const useUserActivityAction = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      activityId: string;
      action: "mark_safe" | "report_suspicious" | "lock_account";
      note?: string;
    }) =>
      api
        .post(`/users/me/activity/${payload.activityId}/action`, {
          action: payload.action,
          note: payload.note,
        })
        .then((r) => r.data),
    onSuccess: (_data, payload) => {
      qc.invalidateQueries({ queryKey: ["user-activity"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });

      if (payload.action === "mark_safe") {
        toast.success("Login marked as safe");
      }

      if (payload.action === "report_suspicious") {
        toast.success("Suspicious activity reported");
      }

      if (payload.action === "lock_account") {
        toast.success("Account locked for protection");
      }
    },
  });
};

export const useUploadAvatar = () => {
  const { updateUser } = useAuthStore();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("avatar", file);
      return api
        .patch("/users/me/avatar", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: (d) => {
      updateUser({ avatar: d.data.avatar });
      toast.success("Photo updated!");
    },
  });
};

export const useKYCStatus = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["kyc-status"],
    queryFn: () => api.get("/users/me/kyc").then((r) => r.data.data),
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });
};

export const useSubmitKYC = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (fd: FormData) =>
      api
        .post("/users/me/kyc", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kyc-status"] });
      toast.success("KYC submitted! Review takes 24-48 hours.");
    },
  });
};

export const useUnreadCount = () => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["unread-count"],
    queryFn: () =>
      api
        .get("/notifications/unread-count")
        .then((r) => r.data.data?.count ?? 0),
    enabled: isAuthenticated,
    refetchInterval: isAuthenticated ? 30000 : false,
    initialData: 0,
  });
};

// ── JOBS ──────────────────────────────────────────────────────
export const useJobs = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["jobs", stableParams],
    queryFn: () =>
      api.get("/jobs", { params: stableParams }).then((r) => r.data),
  });
};

export const useJob = (slug: string) =>
  useQuery({
    queryKey: ["job", slug],
    queryFn: () => api.get(`/jobs/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
  });

export const useCreateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      api.post("/jobs", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job posted!");
    },
  });
};

export const useMyJobs = () =>
  useQuery({
    queryKey: ["my-jobs"],
    queryFn: () => api.get("/jobs/my").then((r) => r.data),
  });

export const useJobApplications = (jobId: string) =>
  useQuery({
    queryKey: ["job-applications", jobId],
    queryFn: () =>
      api.get(`/jobs/${jobId}/applications`).then((r) => r.data.data ?? []),
    enabled: !!jobId,
  });

export const useApplyToJob = (jobId: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      coverLetter: string;
      proposedBudget: number;
      proposedTimeline: string;
    }) => api.post(`/jobs/${jobId}/apply`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications", jobId] });
      qc.invalidateQueries({ queryKey: ["my-applications"] });
      toast.success("Application submitted!");
    },
  });
};

export const useMyApplications = () =>
  useQuery({
    queryKey: ["my-applications"],
    queryFn: () => api.get("/jobs/applications/my").then((r) => r.data),
  });

// ── SERVICES ──────────────────────────────────────────────────
export const useServices = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["services", stableParams],
    queryFn: () =>
      api.get("/services", { params: stableParams }).then((r) => r.data),
  });
};

export const useService = (slug: string) =>
  useQuery({
    queryKey: ["service", slug],
    queryFn: () => api.get(`/services/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
  });

export const useCreateService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      api.post("/services", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service created!");
    },
  });
};

export const useUpdateService = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`/services/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast.success("Service updated");
    },
  });
};

export const useMyServices = () =>
  useQuery({
    queryKey: ["my-services"],
    queryFn: () => api.get("/services/my").then((r) => r.data),
  });

export const usePlaceServiceOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.post("/orders", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
};

export const useWalletPay = () =>
  useMutation({
    mutationFn: (data: { orderId: string }) =>
      api.post("/payments/wallet", data).then((r) => r.data),
  });

// ── PRODUCTS ──────────────────────────────────────────────────
export const useProducts = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["products", stableParams],
    queryFn: () =>
      api.get("/products", { params: stableParams }).then((r) => r.data),
  });
};

export const useProduct = (slug: string) =>
  useQuery({
    queryKey: ["product", slug],
    queryFn: () => api.get(`/products/${slug}`).then((r) => r.data.data),
    enabled: !!slug,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: any) =>
      api.post("/products", payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product listed!");
    },
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`/products/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-products"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product updated");
    },
  });
};

export const useMyProducts = () =>
  useQuery({
    queryKey: ["my-products"],
    queryFn: () => api.get("/products/my").then((r) => r.data),
  });

// ── ORDERS ────────────────────────────────────────────────────
export const useBuyerOrders = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["buyer-orders", stableParams],
    queryFn: () =>
      api.get("/orders/buying", { params: stableParams }).then((r) => r.data),
  });
};

export const useSellerOrders = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["seller-orders", stableParams],
    queryFn: () =>
      api.get("/orders/selling", { params: stableParams }).then((r) => r.data),
  });
};
export const useOrder = (id: string) =>
  useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get(`/orders/${id}`).then((r) => r.data.data),
    enabled: !!id,
  });
export const useCompleteOrder = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/orders/${id}/complete`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      toast.success("Order completed!");
    },
  });
};
export const useUpdateOrderStatus = (id: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { status: string; note?: string }) =>
      api.patch(`/orders/${id}/status`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["order", id] });
      toast.success("Order updated!");
    },
  });
};

// ── WALLET ────────────────────────────────────────────────────
export const useMyWallet = () =>
  useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get("/wallet").then((r) => r.data.data),
  });
export const useTransactions = () =>
  useQuery({
    queryKey: ["transactions"],
    queryFn: () => api.get("/wallet/transactions").then((r) => r.data.data),
  });
export const useInitiateDeposit = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: any) =>
      api.post("/wallet/deposit", d).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast.success("Deposit initiated!");
    },
  });
};

// ── MESSAGES ──────────────────────────────────────────────────
export const useConversations = () =>
  useQuery({
    queryKey: ["conversations"],
    queryFn: () =>
      api
        .get("/messages")
        .then((r) => r.data?.data?.data ?? r.data?.data ?? []),
  });
export const useMessages = (id: string) =>
  useQuery({
    queryKey: ["messages", id],
    queryFn: () =>
      api
        .get(`/messages/${id}`)
        .then((r) => r.data?.data?.data ?? r.data?.data ?? []),
    enabled: !!id,
  });

// ── NOTIFICATIONS ─────────────────────────────────────────────
export const useNotifications = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["notifications", stableParams],
    queryFn: () =>
      api.get("/notifications", { params: stableParams }).then((r) => r.data),
  });
};
export const useMarkNotificationsRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: string[] | "all") =>
      api.patch("/notifications/read", { ids }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });
};

// ── SEARCH ────────────────────────────────────────────────────
export const useSearch = (q: string, type?: string) =>
  useQuery({
    queryKey: ["search", q, type],
    queryFn: () =>
      api.get("/search", { params: { q, type } }).then((r) => r.data.data),
    enabled: q.length >= 2,
  });

export const useTrending = () =>
  useQuery({
    queryKey: ["trending"],
    queryFn: () => api.get("/search/trending").then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
  });

export const usePopularSearches = () =>
  useQuery({
    queryKey: ["popular-searches"],
    queryFn: () => api.get("/search/popular").then((r) => r.data.data),
    staleTime: 1000 * 60 * 5,
  });

export const useRecommendations = (limit = 12) => {
  const stableLimit = Math.min(24, Math.max(3, Number(limit) || 12));

  return useQuery({
    queryKey: ["recommendations", stableLimit],
    queryFn: () =>
      api
        .get("/search/recommendations", { params: { limit: stableLimit } })
        .then((r) => r.data.data),
    staleTime: 1000 * 60,
  });
};

// ── REVIEWS ───────────────────────────────────────────────────
type ReviewSort = "newest" | "highest" | "lowest" | "helpful";

type ReviewQuery = {
  page?: number;
  limit?: number;
  sort?: ReviewSort;
  rating?: number;
};

export const useReviews = (
  refType: string,
  refId: string,
  options: ReviewQuery = {},
) => {
  const stableOptions = toStableParams(options as QueryParams);

  return useQuery({
    queryKey: ["reviews", refType, refId, stableOptions],
    queryFn: () =>
      api
        .get(`/reviews/${refType}/${refId}`, { params: stableOptions })
        .then((r) => r.data.data),
    enabled: !!refType && !!refId,
  });
};

export const useCreateReview = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { orderId: string; rating: number; comment: string }) =>
      api.post("/reviews", d).then((r) => r.data.data),
    onSuccess: (_review, variables) => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["review-status", variables.orderId] });
      qc.invalidateQueries({ queryKey: ["order", variables.orderId] });
      toast.success("Review submitted!");
    },
  });
};

export const useUpdateReview = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({
      reviewId,
      ...payload
    }: {
      reviewId: string;
      rating?: number;
      comment?: string;
    }) => api.patch(`/reviews/${reviewId}`, payload).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      qc.invalidateQueries({ queryKey: ["review-status"] });
      toast.success("Review updated!");
    },
  });
};

export const useRespondToReview = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (d: { reviewId: string; text: string }) =>
      api
        .patch(`/reviews/${d.reviewId}/response`, { text: d.text })
        .then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
      toast.success("Review response posted");
    },
  });
};

export const useToggleReviewHelpful = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (reviewId: string) =>
      api.post(`/reviews/${reviewId}/helpful`).then((r) => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
};

export const useReviewStatus = (orderId: string) =>
  useQuery({
    queryKey: ["review-status", orderId],
    queryFn: () =>
      api.get(`/reviews/order/${orderId}/status`).then((r) => r.data.data),
    enabled: !!orderId,
  });

// ── SAVED ITEMS ───────────────────────────────────────────────
export const useSavedItems = (type?: string) => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["saved", type ?? ""],
    queryFn: () =>
      api
        .get("/saved", { params: type ? { type } : {} })
        .then((r) => r.data.data),
    enabled: isAuthenticated,
  });
};
export const useToggleSave = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: { refType: string; refId: string }) =>
      api.post("/saved/toggle", d).then((r) => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved"] }),
  });
};

// ── ANALYTICS ─────────────────────────────────────────────────
export const useAnalyticsOverview = () =>
  useQuery({
    queryKey: ["analytics-overview"],
    queryFn: () => api.get("/analytics/overview").then((r) => r.data.data),
    staleTime: 1000 * 60 * 2,
  });
export const useRevenueChart = (period = "30") =>
  useQuery({
    queryKey: ["analytics-revenue", period],
    queryFn: () =>
      api
        .get("/analytics/revenue", { params: { period } })
        .then((r) => r.data.data),
  });
export const useListingStats = () =>
  useQuery({
    queryKey: ["analytics-listings"],
    queryFn: () => api.get("/analytics/listings").then((r) => r.data.data),
  });

export const useOpportunityRadar = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["analytics-opportunity-radar", stableParams],
    queryFn: () =>
      api
        .get("/analytics/opportunity-radar", { params: stableParams })
        .then((r) => r.data.data),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 3,
  });
};

export const useTrackOpportunityRadarEvents = () =>
  useMutation({
    mutationFn: (payload: {
      sessionId?: string;
      events: Array<{
        action: "view" | "click" | "conversion";
        itemType: "job" | "service" | "product";
        itemId: string;
        category?: string;
        position?: number;
        score?: number;
        source?: string;
        metadata?: Record<string, unknown>;
      }>;
    }) =>
      api
        .post("/analytics/opportunity-radar/events", payload)
        .then((r) => r.data.data),
  });

// ── COUPONS ───────────────────────────────────────────────────
export const useValidateCoupon = () =>
  useMutation({
    mutationFn: (d: { code: string; orderAmount: number }) =>
      api.post("/coupons/validate", d).then((r) => r.data.data),
  });

// ── ADMIN ─────────────────────────────────────────────────────
export const useAdminStats = () =>
  useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => api.get("/admin/dashboard").then((r) => r.data.data),
  });

export const useAdminSystemHealth = () =>
  useQuery({
    queryKey: ["admin-system-health"],
    queryFn: () => api.get("/admin/system-health").then((r) => r.data.data),
    refetchInterval: 30000,
  });

export const useAdminUsers = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["admin-users", stableParams],
    queryFn: () =>
      api.get("/admin/users", { params: stableParams }).then((r) => r.data),
  });
};

export const useAdminKycSubmissions = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["admin-kyc-submissions", stableParams],
    queryFn: () =>
      api
        .get("/admin/kyc-submissions", { params: stableParams })
        .then((r) => r.data),
  });
};

export const useAdminReviewKycSubmission = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      userId: string;
      decision: "approved" | "rejected";
      reason?: string;
    }) =>
      api
        .patch(`/admin/kyc-submissions/${payload.userId}/review`, {
          decision: payload.decision,
          reason: payload.reason,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-kyc-submissions"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast.success("KYC review saved");
    },
  });
};

export const useAdminContentQueue = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["admin-content", stableParams],
    queryFn: () =>
      api.get("/admin/content", { params: stableParams }).then((r) => r.data),
  });
};

export const useAdminModerateContent = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      type: "job" | "service" | "product";
      id: string;
      action: "approve" | "flag" | "remove" | "restore";
      reason?: string;
    }) =>
      api
        .patch(`/admin/content/${payload.type}/${payload.id}/moderate`, {
          action: payload.action,
          reason: payload.reason,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-content"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast.success("Moderation action applied");
    },
  });
};

export const useAdminDisputes = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["admin-disputes", stableParams],
    queryFn: () =>
      api.get("/admin/disputes", { params: stableParams }).then((r) => r.data),
  });
};

export const useAdminAuditLogs = (params: QueryParams = {}) => {
  const stableParams = toStableParams(params);

  return useQuery({
    queryKey: ["admin-audit-logs", stableParams],
    queryFn: () =>
      api
        .get("/admin/audit-logs", { params: stableParams })
        .then((r) => r.data),
  });
};

export const useAdminDeleteUser = () => {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (d: { userId: string; reason: string }) =>
      api
        .delete(`/admin/users/${d.userId}`, { data: { reason: d.reason } })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-logs"] });
      toast.success("User account deleted");
    },
  });
};

export const useResolveAdminDispute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: {
      disputeId: string;
      resolution: "in_progress" | "completed" | "cancelled" | "refunded";
      note?: string;
    }) =>
      api
        .patch(`/admin/disputes/${d.disputeId}`, {
          resolution: d.resolution,
          note: d.note,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-disputes"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      toast.success("Dispute updated");
    },
  });
};

// ── RECENTLY VIEWED ───────────────────────────────────────────
export const useRelatedServices = (category: string, excludeId?: string) =>
  useQuery({
    queryKey: ["related-services", category, excludeId],
    queryFn: () =>
      api
        .get("/services", { params: { category, limit: "4" } })
        .then((r) =>
          ((r.data.data ?? []) as any[])
            .filter((s: any) => s._id !== excludeId)
            .slice(0, 4),
        ),
    enabled: !!category,
    staleTime: 1000 * 60 * 5,
  });

export const useRelatedProducts = (category: string, excludeId?: string) =>
  useQuery({
    queryKey: ["related-products", category, excludeId],
    queryFn: () =>
      api
        .get("/products", { params: { category, limit: "4" } })
        .then((r) =>
          ((r.data.data ?? []) as any[])
            .filter((p: any) => p._id !== excludeId)
            .slice(0, 4),
        ),
    enabled: !!category,
    staleTime: 1000 * 60 * 5,
  });

// ── JOB MANAGEMENT ────────────────────────────────────────────
export const useDeleteJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/jobs/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
      toast.success("Job deleted");
    },
  });
};
export const useUpdateJob = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: any) =>
      api.patch(`/jobs/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-jobs"] });
      qc.invalidateQueries({ queryKey: ["jobs"] });
      toast.success("Job updated");
    },
  });
};
export const useUpdateApplicationStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      jobId,
      appId,
      status,
    }: {
      jobId: string;
      appId: string;
      status: string;
    }) =>
      api
        .patch(`/jobs/${jobId}/applications/${appId}`, { status })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["job-applications"] });
      toast.success("Application updated");
    },
  });
};

// ── SAVED: check single item ──────────────────────────────────
export const useCheckSaved = (refType: string, refId: string) => {
  const { isAuthenticated } = useAuthStore();
  return useQuery({
    queryKey: ["saved-check", refType, refId],
    queryFn: () =>
      api
        .get("/saved/check", { params: { refType, refId } })
        .then((r) => r.data.data?.saved ?? false),
    enabled: isAuthenticated && !!refId,
    staleTime: 1000 * 30,
  });
};

// ── START CONVERSATION ────────────────────────────────────────
export const useStartConversation = () =>
  useMutation({
    mutationFn: (userId: string) =>
      api.post("/messages/start", { userId }).then((r) => r.data.data),
  });

// ── SEND MESSAGE ──────────────────────────────────────────────
export const useSendMessage = () =>
  useMutation({
    mutationFn: (d: { conversationId: string; text: string }) =>
      api
        .post(`/messages/${d.conversationId}/send`, { text: d.text })
        .then((r) => r.data?.data ?? r.data),
  });

// ── DELETE SERVICE / PRODUCT ──────────────────────────────────
export const useDeleteService = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/services/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      toast.success("Service deleted");
    },
  });
};
export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(`/products/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-products"] });
      toast.success("Product deleted");
    },
  });
};

// ── WRITE REVIEW LINK (computed URL) ─────────────────────────
export const getWriteReviewUrl = (orderId: string) =>
  `/reviews/write?orderId=${orderId}`;

// ── FEATURED CONTENT ──────────────────────────────────────────
export const useFeatured = () =>
  useQuery({
    queryKey: ["featured"],
    queryFn: () => api.get("/search/featured").then((r) => r.data.data),
    staleTime: 1000 * 60 * 10,
  });

// ── PLATFORM STATS (public) ──────────────────────────────────
export const usePlatformStats = () =>
  useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => api.get("/search/platform-stats").then((r) => r.data.data),
    staleTime: 1000 * 60 * 30,
  });
