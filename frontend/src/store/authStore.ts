import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  _id: string;
  fullName: string;
  username: string;
  email: string;
  avatar?: string;
  profileType: string;
  role: string;
  isEmailVerified: boolean;
  isKYCVerified: boolean;
  kycStatus?: string;
  isVerified?: boolean;
  averageRating?: number;
  reviewCount?: number;
  availabilityStatus?: string;
  isVerifiedBadge?: boolean;
  twoFactorEnabled?: boolean;
  twoFactorMethod?: "email";
  bio?: string;
  skills?: string[];
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  updateUser: (patch: Partial<User>) => void;
  setAccessToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      setAuth: (user, accessToken) =>
        set({ user, accessToken, isAuthenticated: true }),
      updateUser: (patch) =>
        set((s) => ({ user: s.user ? { ...s.user, ...patch } : null })),
      setAccessToken: (accessToken) => set({ accessToken }),
      logout: () =>
        set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: "hupfumi-auth",
      // Persist only non-sensitive user profile data. Access tokens remain in memory.
      partialize: (s) => ({ user: s.user }),
    },
  ),
);
