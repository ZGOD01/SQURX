import { create } from 'zustand';
import { mockApi } from '@/lib/mockApi';
import type { StudentProfile, JobVacancy, JobApplication, ConsultationBooking, SystemActivity } from '@/lib/mockDb/schema';
import { consultationApi } from '@/lib/consultationApi';

interface StudentStore {
  profile: StudentProfile | null;
  vacancies: JobVacancy[];
  applications: JobApplication[];
  consultation: ConsultationBooking | null;
  activities: SystemActivity[];
  isLoading: boolean;
  error: string | null;
  saveError: string | null;
  
  // Local state only for dismissals so we don't spam the API with UI state
  dismissedReminderId: string | null;
  dismissReminder: (id: string) => void;

  fetchDashboardData: (userId: string) => Promise<void>;
  updateProfile: (userId: string, data: Partial<StudentProfile> & Record<string, any>) => Promise<void>;
  fetchVacancies: () => Promise<void>;
  applyForJob: (userId: string, vacancyId: string) => Promise<void>;
  bookConsultation: (studentId: string, payload: any) => Promise<void>;
  cancelConsultation: (studentId: string) => Promise<void>;
  deleteAccount: (userId: string) => Promise<void>;
  clearSaveError: () => void;
  
  // Helpers
  getCompletionPercentage: () => number;
  getPendingReminders: () => { id: string; title: string; desc: string; href: string } | null;
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  profile: null,
  vacancies: [],
  applications: [],
  consultation: null,
  activities: [],
  isLoading: true,
  error: null,
  saveError: null,
  dismissedReminderId: null,

  dismissReminder: (id) => set({ dismissedReminderId: id }),
  clearSaveError: () => set({ saveError: null }),

  fetchDashboardData: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      let profile = await mockApi.getStudentProfile(userId);
      if (!profile) {
        await mockApi.updateStudentProfile(userId, {});
        profile = await mockApi.getStudentProfile(userId);
      }
      
      const [applications, activities] = await Promise.all([
        mockApi.getAppliedJobs(userId),
        mockApi.getStudentActivities(userId)
      ]);
      
      let consultation = null;
      try {
        const myAppointments = await consultationApi.getMyAppointments();
        consultation = myAppointments.data && myAppointments.data.length > 0 ? myAppointments.data[0] : null;
        if (consultation) {
           consultation = {
               ...consultation,
               date: consultation.appointmentDate,
               timeSlot: consultation.appointmentTime
           };
        }
      } catch (e) {
        console.warn("Failed to fetch real appointments, falling back to mock");
        consultation = await mockApi.getConsultation(userId);
      }
      
      set({ profile, applications, consultation, activities, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  updateProfile: async (userId: string, data: Partial<StudentProfile> & Record<string, any>) => {
    // Optimistic update: merge data immediately so UI reflects changes without delay
    const currentProfile = get().profile;
    if (currentProfile) {
      set({ profile: { ...currentProfile, ...data }, saveError: null });
    }
    try {
      await mockApi.updateStudentProfile(userId, data);
      const profile = await mockApi.getStudentProfile(userId);
      set({ profile, isLoading: false, saveError: null });
    } catch (err: any) {
      // Rollback optimistic update on error
      set({ profile: currentProfile || null, error: err.message, saveError: err.message, isLoading: false });
    }
  },

  fetchVacancies: async () => {
    set({ isLoading: true });
    try {
      const vacancies = await mockApi.getStudentVacancies();
      set({ vacancies, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  applyForJob: async (userId: string, vacancyId: string) => {
    set({ isLoading: true });
    try {
      await mockApi.applyForJob(userId, vacancyId);
      const [applications, activities] = await Promise.all([
         mockApi.getAppliedJobs(userId),
         mockApi.getStudentActivities(userId)
      ]);
      set({ applications, activities, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  bookConsultation: async (studentId: string, payload: any) => {
    set({ isLoading: true });
    try {
      await consultationApi.bookConsultation(payload);
      
      let consultation = null;
      try {
         const myAppointments = await consultationApi.getMyAppointments();
         consultation = myAppointments.data && myAppointments.data.length > 0 ? myAppointments.data[0] : null;
         if (consultation) {
           consultation = {
               ...consultation,
               date: consultation.appointmentDate,
               timeSlot: consultation.appointmentTime
           };
         }
      } catch(e) {
         console.warn("Failed to fetch real appointments");
      }

      const activities = await mockApi.getStudentActivities(studentId);
      set({ consultation, activities, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  cancelConsultation: async (studentId: string) => {
    set({ isLoading: true });
    try {
      await mockApi.cancelConsultation(studentId);
      const activities = await mockApi.getStudentActivities(studentId);
      set({ consultation: null, activities, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  deleteAccount: async (userId: string) => {
    set({ isLoading: true });
    try {
      await mockApi.deleteStudentAccount(userId);
      set({ profile: null, applications: [], consultation: null, activities: [], isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  getCompletionPercentage: () => {
    const p = get().profile;
    if (!p) return 0;

    // ── Use backend value as source of truth when available ──
    if (typeof p.profileCompletionPercentage === 'number') {
      return p.profileCompletionPercentage;
    }

    // ── Fallback: local calculation when backend hasn't synced yet ──
    let score = 10; // Base score for registration
    if (p.education && p.education.trim().length > 0) score += 10;
    if (p.experienceLevel && p.experienceLevel.trim().length > 0) score += 10;
    if (p.expectedSalary && p.expectedSalary.trim().length > 0) score += 10;
    if (p.location && p.location.trim().length > 0) score += 10;
    if (p.jobType && p.jobType.trim().length > 0) score += 10;
    if (p.careerGoal && p.careerGoal.trim().length > 0) score += 10;
    if (p.skills && p.skills.length > 0) score += 10;
    if (p.cvUrl) score += 20;

    return score;
  },

  getPendingReminders: () => {
    const state = get();
    if (state.isLoading || !state.profile) return null;

    // We no longer track lastActivityAt locally via interval to avoid hammering the DB.
    // Inactivity is handled statically for demo purposes via date comparison on DB activities if we wanted.
    // For now, let's track missing profile fields and consultations directly.

    if (state.getCompletionPercentage() < 100 && state.dismissedReminderId !== 'profile-incomplete') {
        return {
            id: 'profile-incomplete',
            title: 'Profile Incomplete',
            desc: 'Finish your profile to start matching with roles.',
            href: '/student/profile'
        };
    }

    if (state.profile.skills.length === 0 && state.dismissedReminderId !== 'no-skills') {
        return {
            id: 'no-skills',
            title: 'Missing Skills',
            desc: 'Add skill tags to your profile so our algorithm can match you to open vacancies.',
            href: '/student/profile' // combined preferences into profile in schema
        };
    }

    return null;
  }
}));
