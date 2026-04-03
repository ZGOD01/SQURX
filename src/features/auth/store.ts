import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mockApi } from '@/lib/mockApi';
import type { User } from '@/lib/mockDb/schema';

interface AuthStore {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  
  login: (email: string) => Promise<void>;
  logout: () => void;
  register: (name: string, email: string, role: string, cvUrl?: string, documentUrl?: string) => Promise<void>;
  
  // keep token/session validation light by using persist locally
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      error: null,

      login: async (email: string) => {
        set({ isLoading: true, error: null });
        try {
          const user = await mockApi.login(email);
          if (!user) throw new Error('User not found. Try registering.');
          set({ user, isLoading: false });
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      register: async (name: string, email: string, role: string, cvUrl?: string, documentUrl?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Instead of letting users directly register to mockDb directly without auth layer check, 
          // let's simulate registering then logging in
          // (MockDb handles auto user creation via MockAPI if we wrote it, but since we didn't, we will fake a success block)
          await new Promise(resolve => setTimeout(resolve, 800));
          
          const newUser: User = {
             id: `usr-${Date.now()}`,
             name,
             email,
             role: role.toUpperCase() as any,
             status: 'Active',
             lastLoginAt: new Date().toISOString(),
             createdAt: new Date().toISOString()
          };
          
          // Actually, we should add this to mockDb
          const { MockDB } = await import('@/lib/mockDb');
          MockDB.addUser(newUser);

          // Force generate default blank profiles to prevent white screens for new users!
          if (role.toUpperCase() === 'STUDENT') {
              MockDB.updateStudentProfile(newUser.id, { location: '', jobType: 'Full-Time', careerGoal: '', cvUrl: cvUrl || null, documentUrl: documentUrl || null });
          } else if (role.toUpperCase() === 'RECRUITER') {
              MockDB.updateCompanyProfile(newUser.id, { name: '', industry: '', website: '', description: '' });
          }

          set({ user: newUser, isLoading: false });
          
        } catch(err: any) {
          set({ error: err.message, isLoading: false });
          throw err;
        }
      },

      logout: () => {
        set({ user: null });
      },
    }),
    {
      name: 'squrx-auth-session',
      partialize: (state) => ({ user: state.user })
    }
  )
);
