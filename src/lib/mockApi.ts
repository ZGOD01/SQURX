import { MockDB } from './mockDb';
import type { User, StudentProfile, CompanyProfile, JobVacancy, JobApplication, ConsultationBooking, SystemActivity } from './mockDb/schema';
import { API_BASE_URL } from './config';
import { getInMemToken } from '@/features/auth/store';


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
    // Start with whatever MockDB has (may be empty/null for first-time users)
    let profile = MockDB.getStudentProfile(userId);
    try {
        const token = getInMemToken();
        if (token) {
            const res = await fetchWithTimeout(`${API_BASE_URL}/user/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                // Always bypass stale browser cache for profile data
                cache: 'no-store',
                timeout: 3000
            } as any);
            if (res.ok) {
                const json = await res.json();
                const data = json.data || json;
                if (data) {
                    // Ensure we have a profile object to populate
                    if (!profile) {
                        // First visit: create a baseline profile in MockDB
                        MockDB.updateStudentProfile(userId, {});
                        profile = MockDB.getStudentProfile(userId) as StudentProfile;
                    }

                    // ── Backend is the source of truth for all fields below ──

                    // CV / document URLs
                    profile.cvUrl = data.resume || profile.cvUrl;
                    profile.documentUrl = data.schoolLeavingCertificate || profile.documentUrl;
                    profile.resume = data.resume || profile.resume;

                    // Domain / career goal + domain ID
                    if (data.domain?.name) {
                        profile.careerGoal = data.domain.name;
                    } else if (data.customDomain) {
                        profile.careerGoal = data.customDomain;
                    }
                    // Store domain IDs directly on profile (no sessionStorage)
                    if (data.domain?._id) {
                        profile.preferredDomainIds = [data.domain._id];
                    } else if (Array.isArray(data.preferredDomains) && data.preferredDomains.length > 0) {
                        profile.preferredDomainIds = data.preferredDomains
                            .map((d: any) => (typeof d === 'string' ? d : (d._id || null)))
                            .filter(Boolean);
                    }

                    // Education
                    if (data.education?.name) {
                        profile.education = data.education.name;
                        profile.educationId = data.education._id || '';
                    } else if (typeof data.education === 'string' && data.education) {
                        profile.education = data.education;
                    }

                    // Experience level
                    if (data.experienceLevel?.name) {
                        profile.experienceLevel = data.experienceLevel.name;
                        profile.experienceLevelId = data.experienceLevel._id || '';
                    } else if (typeof data.experienceLevel === 'string' && data.experienceLevel) {
                        profile.experienceLevel = data.experienceLevel;
                    }

                    // Skills (array of objects or strings)
                    if (Array.isArray(data.skills) && data.skills.length > 0) {
                        profile.skills = data.skills.map((s: any) =>
                            typeof s === 'string' ? s : (s.name || '')
                        ).filter(Boolean);
                    }

                    // Preferred locations — store IDs directly in profile (no sessionStorage)
                    if (Array.isArray(data.preferredLocations) && data.preferredLocations.length > 0) {
                        const locNames = data.preferredLocations.map((l: any) =>
                            typeof l === 'string' ? l : (l.name || '')
                        ).filter(Boolean);
                        if (locNames.length > 0) {
                            profile.locations = locNames;
                            profile.location = locNames.join(', ');
                        }
                        const locIds = data.preferredLocations
                            .map((l: any) => (typeof l === 'string' ? null : (l._id || null)))
                            .filter(Boolean);
                        if (locIds.length > 0) {
                            profile.preferredLocationIds = locIds;
                        }
                    }

                    // Preferred job types — store IDs directly in profile (no sessionStorage)
                    if (Array.isArray(data.preferredJobTypes) && data.preferredJobTypes.length > 0) {
                        const jtNames = data.preferredJobTypes.map((j: any) =>
                            typeof j === 'string' ? j : (j.name || '')
                        ).filter(Boolean);
                        if (jtNames.length > 0) {
                            profile.jobTypes = jtNames;
                            profile.jobType = jtNames.join(', ');
                        }
                        const jtIds = data.preferredJobTypes
                            .map((j: any) => (typeof j === 'string' ? null : (j._id || null)))
                            .filter(Boolean);
                        if (jtIds.length > 0) {
                            profile.preferredJobTypeIds = jtIds;
                        }
                    }

                    // Salary fields
                    if (data.expectedSalary) profile.expectedSalary = String(data.expectedSalary);
                    if (data.currentSalary) profile.currentSalary = String(data.currentSalary);

                    // Full name
                    if (data.fullName) profile.fullName = data.fullName;

                    // Profile completion percentage (backend is the single source of truth)
                    if (typeof data.profileCompletionPercentage === 'number') {
                        profile.profileCompletionPercentage = data.profileCompletionPercentage;
                    }

                    // GDPR consent (from backend, not from localStorage)
                    if (typeof data.gdprConsent === 'boolean') {
                        profile.gdprConsent = data.gdprConsent;
                    }

                    // Persist synced data back to local MockDB cache
                    MockDB.updateStudentProfile(userId, profile);
                }
            }
        }
    } catch(e) {
        console.error("Failed to fetch real profile data from /user/me", e);
    }
    return profile;
  },

  updateStudentProfile: async (userId: string, data: Partial<StudentProfile> & Record<string, any>): Promise<void> => {
    await delay();
    MockDB.updateStudentProfile(userId, data);
    
    // Sync with real backend via PUT /api/v1/user/me
    try {
        const token = getInMemToken();
        if (token) {
            // Build payload purely from the incoming `data` argument — no sessionStorage fallbacks.
            const payload: Record<string, any> = {};

            if (data.gdprConsent !== undefined) payload.gdprConsent = data.gdprConsent;
            if (data.fullName !== undefined) payload.fullName = data.fullName;
            if (data.mobile !== undefined) payload.mobile = data.mobile;
            else if (data.phone !== undefined) payload.mobile = data.phone;
            if (data.expectedSalary !== undefined) payload.expectedSalary = data.expectedSalary;
            if (data.currentSalary !== undefined) payload.currentSalary = data.currentSalary;
            if (data.preferredDomains !== undefined) payload.preferredDomains = data.preferredDomains;
            if (data.education !== undefined) payload.education = data.education;
            if (data.educationId !== undefined) payload.education = data.educationId;
            if (data.experienceLevel !== undefined) payload.experienceLevel = data.experienceLevel;
            if (data.experienceLevelId !== undefined) payload.experienceLevel = data.experienceLevelId;
            if (data.preferredJobTypes !== undefined) payload.preferredJobTypes = data.preferredJobTypes;
            if (data.skills !== undefined) payload.skills = data.skills;
            if (data.preferredLocations !== undefined) payload.preferredLocations = data.preferredLocations;
            if (data.cvUrl !== undefined) payload.resume = data.cvUrl;

            await fetchWithTimeout(`${API_BASE_URL}/user/me`, {
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
