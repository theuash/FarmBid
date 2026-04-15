import { create } from 'zustand'

// Global app state store
export const useAppStore = create((set, get) => ({
  // Current user and role
  currentUser: null,
  currentRole: 'buyer', // 'buyer', 'admin', 'farmer'
  
  // Dark mode
  darkMode: false,
  
  // Demo mode
  demoMode: false,
  
  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),
  setCurrentRole: (role) => set({ currentRole: role }),
  toggleDarkMode: () => set((state) => ({ darkMode: !state.darkMode })),
  setDemoMode: (mode) => set({ demoMode: mode }),
  
  // Wallet balance
  walletBalance: 0,
  updateWalletBalance: (amount) => set((state) => ({ walletBalance: state.walletBalance + amount })),
}))
