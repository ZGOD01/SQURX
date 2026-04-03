import { create } from 'zustand';
import { mockApi } from '@/lib/mockApi';
import type { User, JobVacancy, JobApplication } from '@/lib/mockDb/schema';

interface AdminStore {
  users: User[];
  vacancies: JobVacancy[];
  applications: JobApplication[];
  isLoading: boolean;
  error: string | null;

  fetchDashboardData: () => Promise<void>;
  toggleUserStatus: (id: string) => Promise<void>;
  updateUserRole: (id: string, role: string) => Promise<void>;
}

export const useAdminStore = create<AdminStore>((set) => ({
  users: [],
  vacancies: [],
  applications: [],
  isLoading: true,
  error: null,

  fetchDashboardData: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await mockApi.getAllStoreData();
      set({ users: data.users, vacancies: data.vacancies, applications: data.applications, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  toggleUserStatus: async (id: string) => {
    set({ isLoading: true });
    try {
      await mockApi.toggleUserStatus(id);
      const data = await mockApi.getAllStoreData();
      set({ users: data.users, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateUserRole: async (id: string, role: string) => {
    set({ isLoading: true });
    try {
      await mockApi.updateUserRole(id, role);
      const data = await mockApi.getAllStoreData();
      set({ users: data.users, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
