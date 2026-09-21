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
  /** Called on logout to wipe all cached profile/application data from memory. */
  reset: () => void;
  
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

  reset: () => set({
    profile: null,
    vacancies: [],
    applications: [],
    consultation: null,
    activities: [],
    isLoading: false,
    error: null,
    saveError: null,
    dismissedReminderId: null,
  }),

  fetchDashboardData: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      let profile = await mockApi.getStudentProfile(userId);
      if (!profile) {
        await mockApi.updateStudentProfile(userId, {});
        profile = await mockApi.getStudentProfile(userId);
      }
      if (profile && (!profile.internships || profile.internships.length === 0)) {
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`squrx_internships_${userId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                profile = { ...profile, internships: parsed };
              }
            }
          }
        } catch {}
      }
      if (profile && (!profile.projects || profile.projects.length === 0)) {
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`squrx_projects_${userId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                profile = { ...profile, projects: parsed };
              }
            }
          }
        } catch {}
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
    // Collect which CV-related fields were explicitly set in this update
    // (including null, which means deletion). We re-apply these after the
    // backend re-fetch so stale remote state cannot silently restore them.
    const CV_FIELDS = ['cvUrl', 'resume', 'cvName', 'resumeName'] as const;
    const cvOverrides: Record<string, any> = {};
    for (const field of CV_FIELDS) {
      if (field in data) cvOverrides[field] = data[field] ?? null;
    }
    const hasCvOverride = Object.keys(cvOverrides).length > 0;
    const hasInternshipsOverride = 'internships' in data;
    const internshipsOverride = data.internships;
    const hasProjectsOverride = 'projects' in data;
    const projectsOverride = data.projects;

    try {
      console.log('[StudentStore] updateProfile called with:', data);
      await mockApi.updateStudentProfile(userId, data);
      const profile = await mockApi.getStudentProfile(userId);
      // Re-apply explicit CV, internships, and projects overrides on top of what the backend returned
      // so a stale /user/me response cannot resurrect a deleted/replaced CV or wipe local data.
      let mergedInternships = profile?.internships;
      if (hasInternshipsOverride) {
        mergedInternships = internshipsOverride;
      } else if (!mergedInternships || mergedInternships.length === 0) {
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`squrx_internships_${userId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                mergedInternships = parsed;
              }
            }
          }
        } catch {}
      }

      let mergedProjects = profile?.projects;
      if (hasProjectsOverride) {
        mergedProjects = projectsOverride;
      } else if (!mergedProjects || mergedProjects.length === 0) {
        try {
          if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(`squrx_projects_${userId}`);
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed) && parsed.length > 0) {
                mergedProjects = parsed;
              }
            }
          }
        } catch {}
      }

      const mergedProfile = {
        ...profile,
        ...(hasCvOverride ? cvOverrides : {}),
        internships: mergedInternships || [],
        projects: mergedProjects || []
      } as any;
      set({ profile: mergedProfile, isLoading: false, saveError: null });
      console.log('[StudentStore] updateProfile succeeded, mergedProfile:', mergedProfile);
    } catch (err: any) {
      console.error('[StudentStore] updateProfile error:', err);
      // Rollback optimistic update on error
      set({ profile: currentProfile || null, error: err.message, saveError: err.message, isLoading: false });
      throw err;
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

    const expLevelStr = typeof p.experienceLevel === 'object' && p.experienceLevel ? (p.experienceLevel as any).name : String(p.experienceLevel || '');
    const isFresher = expLevelStr.toLowerCase().includes('fresher');

    let score = 0;

    // 1. Account & Contact (10%)
    if ((p.fullName && p.fullName.trim()) && (p.email && p.email.trim())) {
      score += 10;
    }

    // 2. Education History (15%)
    if (Array.isArray(p.educationHistory) && p.educationHistory.length > 0) {
      const hasValidEdu = p.educationHistory.some(e => e.education || e.customEducation || e.university || e.customUniversity);
      if (hasValidEdu) score += 15;
    }

    // 3. Career Preferences (15%)
    // - Preferred Role / Domain (5%)
    if (p.careerGoal && p.careerGoal.trim().length > 0) {
      score += 5;
    }
    // - Preferred Location (5%)
    if ((p.location && p.location.trim().length > 0) || (Array.isArray(p.locations) && p.locations.length > 0)) {
      score += 5;
    }
    // - Preferred Job Type & Expected Salary (5%)
    const hasExpectedSalary = Boolean(
      p.expectedSalary &&
      (typeof p.expectedSalary === 'string'
        ? p.expectedSalary.trim().length > 0
        : (p.expectedSalary as any).amount != null && (p.expectedSalary as any).amount !== '' && Number((p.expectedSalary as any).amount) > 0)
    );
    if ((p.jobType && p.jobType.trim().length > 0) || hasExpectedSalary) {
      score += 5;
    }

    // 4. Skills & CV (15%)
    // - Skills (5%)
    if (Array.isArray(p.skills) && p.skills.length > 0) {
      score += 5;
    }
    // - CV Upload (10%)
    if ((p.cvUrl && p.cvUrl.trim().length > 0) || (p.resume && p.resume.trim().length > 0) || (p.cvName && p.cvName.trim().length > 0)) {
      score += 10;
    }

    // 5. Experience Level & Compensation (10%)
    if (p.experienceLevel && p.experienceLevel.trim().length > 0) {
      score += 5;
    }
    const hasCurrentSalary = Boolean(
      p.currentSalary &&
      (typeof p.currentSalary === 'string'
        ? p.currentSalary.trim().length > 0
        : (p.currentSalary as any).amount != null && (p.currentSalary as any).amount !== '' && Number((p.currentSalary as any).amount) >= 0)
    );
    if (isFresher || (hasCurrentSalary && Number((p.currentSalary as any)?.amount) > 0)) {
      score += 5;
    }

    // 6. Personal Details & Languages (10%)
    const hasPersonalDetails = Boolean(
      (p.gender && p.gender.trim()) ||
      (p.dob && p.dob.trim()) ||
      (p.currentLocation && p.currentLocation.trim()) ||
      (p.hometown && p.hometown.trim())
    );
    if (hasPersonalDetails) {
      score += 5;
    }
    const hasLanguages = Array.isArray(p.languagesKnown) && p.languagesKnown.length > 0 && p.languagesKnown.some(l => l.language || l.languageName);
    if (hasLanguages) {
      score += 5;
    }

    // 7. Work / Practical Experience (Employment OR Internships, or Fresher candidate) (15%)
    const hasEmployment = Array.isArray(p.employmentHistory) && p.employmentHistory.length > 0 && p.employmentHistory.some(e => e.companyName?.trim() || e.jobTitle?.trim());
    const hasInternships = Array.isArray(p.internships) && p.internships.length > 0 && p.internships.some(i => i.companyName?.trim() || i.role?.trim());
    if (isFresher || hasEmployment || hasInternships) {
      score += 15;
    }

    // 8. Key Projects & Certifications (10%)
    const hasProjects = Array.isArray(p.projects) && p.projects.length > 0 && p.projects.some((proj: any) => (typeof proj === 'string' && proj.trim()) || (proj?.title && String(proj.title).trim()));
    if (hasProjects) {
      score += 5;
    }
    const hasCertifications = Array.isArray(p.certifications) && p.certifications.length > 0 && p.certifications.some(c => c.name && c.name.trim());
    if (hasCertifications) {
      score += 5;
    }

    // 9. Awards, Recognitions & Other Achievements (5%)
    const rawAwards = p.awards as any;
    const hasAwards = Boolean(
      rawAwards && (typeof rawAwards === 'string' ? rawAwards.trim().length > 0 : (Array.isArray(rawAwards) && rawAwards.length > 0))
    );
    const hasOtherAchievements = Boolean(
      p.otherAchievements && (
        Array.isArray(p.otherAchievements)
          ? p.otherAchievements.length > 0 && p.otherAchievements.some((a: any) => (typeof a === 'string' && a.trim()) || (a?.name && String(a.name).trim()))
          : (typeof p.otherAchievements === 'string' && p.otherAchievements.trim().length > 0)
      )
    );
    const hasProfileSummary = Boolean(
      p.profileSummary && typeof p.profileSummary === 'string' && p.profileSummary.trim().length > 0
    );
    if (hasAwards || hasOtherAchievements || hasProfileSummary) {
      score += 5;
    }

    return Math.min(100, Math.max(0, score));
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
