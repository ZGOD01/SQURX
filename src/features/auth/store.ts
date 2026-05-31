import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  _hasHydrated: boolean;
  
  setAuth: (user: any, token: string) => void;
  logout: () => void;
  setHasHydrated: (val: boolean) => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,
      _hasHydrated: false,

      setAuth: (user: any, token: string) => {
        // Ensure role is uppercase to match frontend role checking
        const role = String(user.role).toUpperCase();
        // Map backend specific fields to frontend expected ones
        const mappedUser = { 
            ...user, 
            role, 
            name: user.fullName || user.name, 
            id: user._id || user.id 
        };
        set({ user: mappedUser });
        localStorage.setItem('token', token);
      },

      logout: () => {
        set({ user: null });
        localStorage.removeItem('token');
      },

      setHasHydrated: (val: boolean) => {
        set({ _hasHydrated: val });
      },
    }),
    {
      name: 'squrx-auth-session',
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

