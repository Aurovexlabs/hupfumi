import { create } from 'zustand';

interface UIState {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (v: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (v) => set({ mobileMenuOpen: v }),
}));
