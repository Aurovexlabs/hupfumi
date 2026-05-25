import AppLayout from "@/components/common/AppLayout";
import AuthLayout from "@/components/common/AuthLayout";
import { useAuthStore } from "@/store/authStore";
import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider,
} from "@tanstack/react-router";
import { lazy, Suspense, useEffect, type ComponentType } from "react";

type AppRouterContext = {
  queryClient: QueryClient;
  auth: {
    isAuthenticated: boolean;
    role: string | null;
  };
};

const isAdminRole = (role: string | null | undefined) =>
  ["admin", "superadmin"].includes(role ?? "");

// ── Lazy pages ────────────────────────────────────────────────
const S =
  <P extends object>(C: ComponentType<P>) =>
  (props: P) => (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-8 h-8 border-2 border-brand-orange border-t-transparent rounded-full" />
        </div>
      }
    >
      <C {...props} />
    </Suspense>
  );

const HomePage = lazy(() => import("@/pages/HomePage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPassword = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const VerifyEmail = lazy(() => import("@/pages/auth/VerifyEmailPage"));

const DashboardPage = lazy(() => import("@/pages/dashboard/DashboardPage"));
const WalletPage = lazy(() => import("@/pages/dashboard/WalletPage"));
const AnalyticsPage = lazy(() => import("@/pages/dashboard/AnalyticsPage"));
const SavedItemsPage = lazy(() => import("@/pages/dashboard/SavedItemsPage"));
const ReviewsPage = lazy(() => import("@/pages/reviews/ReviewsPage"));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage"));
const GigPage = lazy(() => import("@/pages/gig/GigPage"));

const JobsPage = lazy(() => import("@/pages/jobs/JobsPage"));
const JobDetailPage = lazy(() => import("@/pages/jobs/JobDetailPage"));
const PostJobPage = lazy(() => import("@/pages/jobs/PostJobPage"));
const MyJobsPage = lazy(() => import("@/pages/jobs/MyJobsPage"));
const MyApplications = lazy(() => import("@/pages/jobs/MyApplicationsPage"));

const ServicesPage = lazy(() => import("@/pages/services/ServicesPage"));
const ServiceDetail = lazy(() => import("@/pages/services/ServiceDetailPage"));
const CreateService = lazy(() => import("@/pages/services/CreateServicePage"));
const MyServices = lazy(() => import("@/pages/services/MyServicesPage"));

const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const ProductDetail = lazy(() => import("@/pages/products/ProductDetailPage"));
const CreateProduct = lazy(() => import("@/pages/products/CreateProductPage"));
const MyProducts = lazy(() => import("@/pages/products/MyProductsPage"));

const OrdersPage = lazy(() => import("@/pages/orders/OrdersPage"));
const OrderDetail = lazy(() => import("@/pages/orders/OrderDetailPage"));
const MessagesPage = lazy(() => import("@/pages/messages/MessagesPage"));

const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const EditProfilePage = lazy(() => import("@/pages/profile/EditProfilePage"));

const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminDisputes = lazy(() => import("@/pages/admin/AdminDisputesPage"));
const AdminKYC = lazy(() => import("@/pages/admin/AdminKYCPage"));
const AdminModeration = lazy(() => import("@/pages/admin/AdminModerationPage"));

const AboutPage = lazy(() => import("@/pages/company/AboutPage"));
const PricingPage = lazy(() => import("@/pages/company/PricingPage"));
const TermsPage = lazy(() => import("@/pages/company/TermsPage"));
const PrivacyPage = lazy(() => import("@/pages/company/PrivacyPage"));
const ContactPage = lazy(() => import("@/pages/company/ContactPage"));
const SecurityPage = lazy(() => import("@/pages/company/SecurityPage"));

// ── Auth guard ────────────────────────────────────────────────
const requireAuth = ({
  context,
  location,
}: {
  context: AppRouterContext;
  location: { href: string };
}) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }
};
const requireAdmin = ({
  context,
  location,
}: {
  context: AppRouterContext;
  location: { href: string };
}) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }

  if (!isAdminRole(context.auth.role)) {
    throw redirect({ to: "/dashboard" });
  }
};

const requireMarketplaceUser = ({
  context,
  location,
}: {
  context: AppRouterContext;
  location: { href: string };
}) => {
  if (!context.auth.isAuthenticated) {
    throw redirect({
      to: "/login",
      search: { redirect: location.href },
    });
  }

  if (isAdminRole(context.auth.role)) {
    throw redirect({ to: "/admin" });
  }
};

// ── Routes ────────────────────────────────────────────────────
const root = createRootRouteWithContext<AppRouterContext>()({
  component: () => <Outlet />,
});
const authGroup = createRoute({
  getParentRoute: () => root,
  id: "auth",
  component: () => (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ),
});
const app = createRoute({
  getParentRoute: () => root,
  id: "app",
  component: () => (
    <AppLayout>
      <Outlet />
    </AppLayout>
  ),
});

// Auth routes
const rLogin = createRoute({
  getParentRoute: () => authGroup,
  path: "/login",
  component: S(LoginPage),
});
const rRegister = createRoute({
  getParentRoute: () => authGroup,
  path: "/register",
  component: S(RegisterPage),
});
const rForgot = createRoute({
  getParentRoute: () => authGroup,
  path: "/forgot-password",
  component: S(ForgotPassword),
});
const rReset = createRoute({
  getParentRoute: () => authGroup,
  path: "/reset-password",
  component: S(ResetPassword),
});
const rVerify = createRoute({
  getParentRoute: () => authGroup,
  path: "/verify-email",
  component: S(VerifyEmail),
});

// Public routes
const rHome = createRoute({
  getParentRoute: () => app,
  path: "/",
  component: S(HomePage),
});
const rSearch = createRoute({
  getParentRoute: () => app,
  path: "/search",
  component: S(SearchPage),
});
const rJobs = createRoute({
  getParentRoute: () => app,
  path: "/jobs",
  component: S(JobsPage),
});
const rJobDetail = createRoute({
  getParentRoute: () => app,
  path: "/jobs/$slug",
  component: S(JobDetailPage),
});
const rServices = createRoute({
  getParentRoute: () => app,
  path: "/services",
  component: S(ServicesPage),
});
const rSvcDetail = createRoute({
  getParentRoute: () => app,
  path: "/services/$slug",
  component: S(ServiceDetail),
});
const rProducts = createRoute({
  getParentRoute: () => app,
  path: "/products",
  component: S(ProductsPage),
});
const rProdDetail = createRoute({
  getParentRoute: () => app,
  path: "/products/$slug",
  component: S(ProductDetail),
});
const rProfile = createRoute({
  getParentRoute: () => app,
  path: "/profile/$username",
  component: S(ProfilePage),
});
const rAbout = createRoute({
  getParentRoute: () => app,
  path: "/about",
  component: S(AboutPage),
});
const rPricing = createRoute({
  getParentRoute: () => app,
  path: "/pricing",
  component: S(PricingPage),
});
const rTerms = createRoute({
  getParentRoute: () => app,
  path: "/terms",
  component: S(TermsPage),
});
const rPrivacy = createRoute({
  getParentRoute: () => app,
  path: "/privacy",
  component: S(PrivacyPage),
});
const rContact = createRoute({
  getParentRoute: () => app,
  path: "/contact",
  component: S(ContactPage),
});
const rSecurity = createRoute({
  getParentRoute: () => app,
  path: "/security",
  component: S(SecurityPage),
});
const rNotFound = createRoute({
  getParentRoute: () => app,
  path: "*",
  component: S(NotFoundPage),
});
const rReviews = createRoute({
  getParentRoute: () => app,
  path: "/reviews/write",
  beforeLoad: requireMarketplaceUser,
  component: S(ReviewsPage),
});
const rLeaderboard = createRoute({
  getParentRoute: () => app,
  path: "/leaderboard",
  component: S(LeaderboardPage),
});
const rGig = createRoute({
  getParentRoute: () => app,
  path: "/gig/$id",
  component: S(GigPage),
});

// Protected routes
const rDash = createRoute({
  getParentRoute: () => app,
  path: "/dashboard",
  beforeLoad: requireMarketplaceUser,
  component: S(DashboardPage),
});
const rWallet = createRoute({
  getParentRoute: () => app,
  path: "/wallet",
  beforeLoad: requireMarketplaceUser,
  component: S(WalletPage),
});
const rPaymentSuccess = createRoute({
  getParentRoute: () => app,
  path: "/payment/success",
  beforeLoad: requireMarketplaceUser,
  component: S(WalletPage),
});
const rAnalytics = createRoute({
  getParentRoute: () => app,
  path: "/analytics",
  beforeLoad: requireMarketplaceUser,
  component: S(AnalyticsPage),
});
const rSaved = createRoute({
  getParentRoute: () => app,
  path: "/saved",
  beforeLoad: requireMarketplaceUser,
  component: S(SavedItemsPage),
});
const rNotifs = createRoute({
  getParentRoute: () => app,
  path: "/notifications",
  beforeLoad: requireMarketplaceUser,
  component: S(NotificationsPage),
});
const rMessages = createRoute({
  getParentRoute: () => app,
  path: "/messages",
  beforeLoad: requireMarketplaceUser,
  component: S(MessagesPage),
});
const rOrders = createRoute({
  getParentRoute: () => app,
  path: "/orders",
  beforeLoad: requireMarketplaceUser,
  component: S(OrdersPage),
});
const rOrderDetail = createRoute({
  getParentRoute: () => app,
  path: "/orders/$id",
  beforeLoad: requireMarketplaceUser,
  component: S(OrderDetail),
});
const rPostJob = createRoute({
  getParentRoute: () => app,
  path: "/jobs/new",
  beforeLoad: requireMarketplaceUser,
  component: S(PostJobPage),
});
const rMyJobs = createRoute({
  getParentRoute: () => app,
  path: "/my/jobs",
  beforeLoad: requireMarketplaceUser,
  component: S(MyJobsPage),
});
const rMyApps = createRoute({
  getParentRoute: () => app,
  path: "/my/applications",
  beforeLoad: requireMarketplaceUser,
  component: S(MyApplications),
});
const rNewSvc = createRoute({
  getParentRoute: () => app,
  path: "/services/new",
  beforeLoad: requireMarketplaceUser,
  component: S(CreateService),
});
const rMyServices = createRoute({
  getParentRoute: () => app,
  path: "/my/services",
  beforeLoad: requireMarketplaceUser,
  component: S(MyServices),
});
const rNewProd = createRoute({
  getParentRoute: () => app,
  path: "/products/new",
  beforeLoad: requireMarketplaceUser,
  component: S(CreateProduct),
});
const rMyProducts = createRoute({
  getParentRoute: () => app,
  path: "/my/products",
  beforeLoad: requireMarketplaceUser,
  component: S(MyProducts),
});
const rEditProf = createRoute({
  getParentRoute: () => app,
  path: "/settings/profile",
  beforeLoad: requireMarketplaceUser,
  component: S(EditProfilePage),
});
const rAdmin = createRoute({
  getParentRoute: () => app,
  path: "/admin",
  beforeLoad: requireAdmin,
  component: S(AdminDashboard),
});
const rAdminUsers = createRoute({
  getParentRoute: () => app,
  path: "/admin/users",
  beforeLoad: requireAdmin,
  component: S(AdminUsers),
});
const rAdminDisp = createRoute({
  getParentRoute: () => app,
  path: "/admin/disputes",
  beforeLoad: requireAdmin,
  component: S(AdminDisputes),
});
const rAdminKyc = createRoute({
  getParentRoute: () => app,
  path: "/admin/kyc",
  beforeLoad: requireAdmin,
  component: S(AdminKYC),
});
const rAdminModeration = createRoute({
  getParentRoute: () => app,
  path: "/admin/moderation",
  beforeLoad: requireAdmin,
  component: S(AdminModeration),
});

const routeTree = root.addChildren([
  authGroup.addChildren([rLogin, rRegister, rForgot, rReset, rVerify]),
  app.addChildren([
    rHome,
    rSearch,
    rAbout,
    rPricing,
    rTerms,
    rPrivacy,
    rContact,
    rSecurity,
    rJobs,
    rPostJob,
    rJobDetail,
    rMyJobs,
    rMyApps,
    rServices,
    rNewSvc,
    rSvcDetail,
    rMyServices,
    rProducts,
    rNewProd,
    rProdDetail,
    rMyProducts,
    rProfile,
    rEditProf,
    rDash,
    rWallet,
    rPaymentSuccess,
    rAnalytics,
    rSaved,
    rNotifs,
    rMessages,
    rOrders,
    rOrderDetail,
    rAdmin,
    rAdminUsers,
    rAdminDisp,
    rAdminKyc,
    rAdminModeration,
    rReviews,
    rLeaderboard,
    rGig,
    rNotFound,
  ]),
]);

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined!,
    auth: {
      isAuthenticated: false,
      role: null,
    },
  },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

interface AppProps {
  queryClient: QueryClient;
}

export default function App({ queryClient }: AppProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role ?? null);

  useEffect(() => {
    router.invalidate();
  }, [isAuthenticated, role]);

  useEffect(() => {
    const onAuthExpired = () => {
      router.navigate({ to: "/login", replace: true });
    };

    window.addEventListener("hupfumi:auth-expired", onAuthExpired);
    return () => {
      window.removeEventListener("hupfumi:auth-expired", onAuthExpired);
    };
  }, []);

  return (
    <RouterProvider
      router={router}
      context={{
        queryClient,
        auth: {
          isAuthenticated,
          role,
        },
      }}
    />
  );
}
