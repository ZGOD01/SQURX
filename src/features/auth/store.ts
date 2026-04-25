import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthStore {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  
  setAuth: (user: any, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      setAuth: (user: any, token: string) => {
        // Ensure role is uppercase to match frontend role checking
        const role = String(user.role).toUpperCase();
        set({ user: { ...user, role } });
        localStorage.setItem('token', token);
      },

      logout: () => {
        set({ user: null });
        localStorage.removeItem('token');
      },
    }),
    {
      name: 'squrx-auth-session',
      partialize: (state) => ({ user: state.user })
    }
  )
);
