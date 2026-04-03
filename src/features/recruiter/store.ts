import { create } from 'zustand';
import { mockApi } from '@/lib/mockApi';
import type { CompanyProfile, JobVacancy, JobApplication, User } from '@/lib/mockDb/schema';

interface RecruiterStore {
  company: CompanyProfile | null;
  vacancies: JobVacancy[];
  candidates: { profile: any, applications: JobApplication[], user: User }[];
  isLoading: boolean;
  error: string | null;

  fetchDashboardData: (userId: string) => Promise<void>;
  updateCompany: (userId: string, data: Partial<CompanyProfile>) => Promise<void>;
  createVacancy: (vacancy: JobVacancy) => Promise<void>;
  updateVacancyStatus: (id: string, status: 'Active' | 'Closed') => Promise<void>;
  deleteVacancy: (id: string) => Promise<void>;
  loadCandidates: () => Promise<void>;
  makeDecision: (appId: string, status: 'SHORTLIST' | 'REJECT' | 'HOLD', notes: string) => Promise<void>;
}

export const useRecruiterStore = create<RecruiterStore>((set) => ({
  company: null,
  vacancies: [],
  candidates: [],
  isLoading: true,
  error: null,

  fetchDashboardData: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const [company, vacancies] = await Promise.all([
        mockApi.getCompanyProfile(userId),
        mockApi.getRecruiterVacancies(userId)
      ]);
      set({ company, vacancies, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateCompany: async (userId: string, data: Partial<CompanyProfile>) => {
    set({ isLoading: true });
    try {
      await mockApi.updateCompanyProfile(userId, data);
      const company = await mockApi.getCompanyProfile(userId);
      set({ company, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  createVacancy: async (vacancy: JobVacancy) => {
    set({ isLoading: true });
    try {
      await mockApi.createVacancy(vacancy);
      const vacancies = await mockApi.getRecruiterVacancies(vacancy.recruiterId);
      set({ vacancies, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateVacancyStatus: async (id: string, status: 'Active' | 'Closed') => {
    set({ isLoading: true });
    try {
      await mockApi.updateVacancy(id, { status });
      // We don't have recruiterId here directly, so we filter full list
      set((state) => ({
        vacancies: state.vacancies.map(v => v.id === id ? { ...v, status } : v),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteVacancy: async (id: string) => {
    set({ isLoading: true });
    try {
      await mockApi.deleteVacancy(id);
      set((state) => ({
        vacancies: state.vacancies.filter(v => v.id !== id),
        isLoading: false
      }));
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  loadCandidates: async () => {
    set({ isLoading: true });
    try {
      const candidates = await mockApi.getAllCandidatesFullDetails();
      set({ candidates, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  makeDecision: async (appId: string, status: 'SHORTLIST' | 'REJECT' | 'HOLD', notes: string) => {
    set({ isLoading: true });
    try {
      await mockApi.updateApplicationDecision(appId, { status, notes });
      const candidates = await mockApi.getAllCandidatesFullDetails();
      set({ candidates, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  }
}));
