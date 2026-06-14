import { MockDB } from './mockDb';
import type { User, StudentProfile, CompanyProfile, JobVacancy, JobApplication, ConsultationBooking, SystemActivity } from './mockDb/schema';
import { useAuthStore } from '@/features/auth/store';

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 2500, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(id);
    
    if (response.status === 403) {
      const clone = response.clone();
      clone.json().then(body => {
        if (body.message === 'Account not verified' || body.message?.toLowerCase().includes('verify') || body.message?.toLowerCase().includes('not verified')) {
          window.dispatchEvent(new CustomEvent('squrx-unverified-account'));
        }
      }).catch(() => {
        if (url.includes('/user/me') || url.includes('/consultations/')) {
          window.dispatchEvent(new CustomEvent('squrx-unverified-account'));
        }
      });
    }
    
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
};

export const mockApi = {
  // Auth
  login: async (email: string): Promise<User | null> => {
    await delay();
    
    // Explicit backdoor for admin to prevent any cache issues
    if (email.toLowerCase() === 'admin@gmail.com') {
      return {
        id: 'usr-admin',
        name: 'System Admin',
        email: 'admin@gmail.com',
        role: 'ADMIN',
        status: 'Active',
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
    }

    const user = MockDB.getUsers().find(u => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      if (user.status === 'Suspended') throw new Error('Account Suspended');
      MockDB.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
      return { ...user, lastLoginAt: new Date().toISOString() };
    }
    return null;
  },

  // Student
  getStudentProfile: async (userId: string): Promise<StudentProfile | null> => {
    await delay(500);
    const profile = MockDB.getStudentProfile(userId);
    try {
        const token = localStorage.getItem('token');
        if (token && profile) {
            const res = await fetchWithTimeout('https://squrx-backend.onrender.com/api/v1/user/me', {
                headers: { 'Authorization': `Bearer ${token}` },
                timeout: 2000
            });
            if (res.ok) {
                const { data } = await res.json();
                if (data) {
                    profile.cvUrl = data.resume || profile.cvUrl;
                    profile.documentUrl = data.schoolLeavingCertificate || profile.documentUrl;
                    // Sync the real domain/career goal and cache the domain ID for future updates
                    if (data.domain?.name) {
                        profile.careerGoal = data.domain.name;
                        // Cache domain ID so PUT /user/me can send { domain: id } instead of customDomain
                        if (data.domain._id) {
                            localStorage.setItem('squrx_selected_domain_id', data.domain._id);
                        }
                    } else if (data.customDomain) {
                        profile.careerGoal = data.customDomain;
                        // No real domain ID — clear any stale cache
                        localStorage.removeItem('squrx_selected_domain_id');
                    }
                    // Sync backend user attributes with frontend useAuthStore
                    useAuthStore.getState().setAuth(data, token);
                }
            }
        }
    } catch(e) {
        console.error("Failed to fetch real profile data", e);
    }
    return profile;
  },
  updateStudentProfile: async (userId: string, data: Partial<StudentProfile>): Promise<void> => {
    await delay();
    MockDB.updateStudentProfile(userId, data);
    
    // Sync domain/career goal with real backend via PUT /api/v1/user/me
    try {
        const token = localStorage.getItem('token');
        if (token && data.careerGoal !== undefined) {
            // If a domain was selected from the dropdown, a domain ID will be cached.
            // Prefer sending { domain: id } (proper DB reference) over { customDomain: text }.
            const cachedDomainId = localStorage.getItem('squrx_selected_domain_id');

            const payload: Record<string, string> = cachedDomainId
                ? { domain: cachedDomainId }        // Proper backend domain reference
                : { customDomain: data.careerGoal }; // Free-text fallback

            await fetchWithTimeout('https://squrx-backend.onrender.com/api/v1/user/me', {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                timeout: 3000
            });
        }
    } catch(e) {
        console.error("Failed to sync profile update with backend", e);
    }
  },
  deleteStudentAccount: async (userId: string): Promise<void> => {
    await delay(1000); // give it a mock delay for realism
    MockDB.deleteStudentAccount(userId);
  },
  getStudentVacancies: async (): Promise<JobVacancy[]> => {
    await delay(600);
    return MockDB.getVacancies().filter(v => v.status === 'Active');
  },
  applyForJob: async (studentId: string, vacancyId: string): Promise<void> => {
    await delay();
    const user = MockDB.getUserById(studentId);
    if (!user) throw new Error('User not found');
    MockDB.createApplication({
        id: `app-${Date.now()}`,
        studentId,
        vacancyId,
        appliedAt: new Date().toISOString(),
        decision: null
    });
    MockDB.addActivity({
        id: `act-${Date.now()}`,
        userId: studentId,
        type: 'APPLY',
        description: `Applied for Vacancy ID: ${vacancyId}`,
        timestamp: new Date().toISOString()
    });
  },
  getAppliedJobs: async (studentId: string): Promise<JobApplication[]> => {
    await delay(400);
    return MockDB.getApplicationsByStudent(studentId);
  },
  getConsultation: async (studentId: string): Promise<ConsultationBooking | null> => {
    await delay(300);
    return MockDB.getConsultation(studentId);
  },
  bookConsultation: async (booking: ConsultationBooking): Promise<void> => {
    await delay();
    MockDB.bookConsultation(booking);
    MockDB.addActivity({
        id: `act-${Date.now()}`,
        userId: booking.studentId,
        type: 'BOOK',
        description: `Booked consultation on ${booking.date} at ${booking.timeSlot}`,
        timestamp: new Date().toISOString()
    });
  },
  cancelConsultation: async (studentId: string): Promise<void> => {
    await delay();
    MockDB.cancelConsultation(studentId);
  },
  getStudentActivities: async (userId: string): Promise<SystemActivity[]> => {
    await delay(300);
    return MockDB.getActivities(userId);
  },

  // Recruiter
  getCompanyProfile: async (userId: string): Promise<CompanyProfile | null> => {
    await delay(500);
    return MockDB.getCompanyProfile(userId);
  },
  updateCompanyProfile: async (userId: string, data: Partial<CompanyProfile>): Promise<void> => {
    await delay();
    MockDB.updateCompanyProfile(userId, data);
  },
  getRecruiterVacancies: async (recruiterId: string): Promise<JobVacancy[]> => {
    await delay(600);
    return MockDB.getVacanciesByRecruiter(recruiterId);
  },
  createVacancy: async (vacancy: JobVacancy): Promise<void> => {
    await delay();
    MockDB.createVacancy(vacancy);
    MockDB.addActivity({
        id: `act-${Date.now()}`,
        userId: vacancy.recruiterId,
        type: 'POST_JOB',
        description: `Posted new active vacancy: ${vacancy.title}`,
        timestamp: new Date().toISOString()
    });
  },
  updateVacancy: async (id: string, updates: Partial<JobVacancy>): Promise<void> => {
    await delay(400);
    MockDB.updateVacancy(id, updates);
  },
  deleteVacancy: async (id: string): Promise<void> => {
    await delay();
    MockDB.deleteVacancy(id);
  },
  getApplicationsForVacancy: async (vacancyId: string): Promise<JobApplication[]> => {
    await delay(300);
    return MockDB.getApplicationsForVacancy(vacancyId);
  },
  getAllCandidatesFullDetails: async (): Promise<{profile: StudentProfile, applications: JobApplication[], user: User}[]> => {
    await delay(800);
    const students = MockDB.getStudentProfiles();
    return students.map(s => ({
        profile: s,
        applications: MockDB.getApplicationsByStudent(s.userId),
        user: MockDB.getUserById(s.userId)!
    }));
  },
  updateApplicationDecision: async (appId: string, decision: { status: 'SHORTLIST'|'REJECT'|'HOLD', notes: string }): Promise<void> => {
    await delay();
    MockDB.updateApplicationDecision(appId, decision);
  },

  // Admin
  getAllUsers: async (): Promise<User[]> => {
    await delay(800);
    return MockDB.getUsers();
  },
  updateUserRole: async (id: string, role: string): Promise<void> => {
    await delay();
    MockDB.updateUser(id, { role: role as User['role'] });
  },
  toggleUserStatus: async (id: string): Promise<void> => {
    await delay();
    const user = MockDB.getUserById(id);
    if (user) {
        MockDB.updateUser(id, { status: user.status === 'Active' ? 'Suspended' : 'Active' });
    }
  },
  getAllStoreData: async () => {
    await delay(1000); // Admin reports call
    return {
        users: MockDB.getUsers(),
        vacancies: MockDB.getVacancies(),
        applications: MockDB.getApplications()
    };
  }
};
