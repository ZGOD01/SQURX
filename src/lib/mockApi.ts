import { MockDB } from './mockDb';
import type { User, StudentProfile, CompanyProfile, JobVacancy, JobApplication, ConsultationBooking, SystemActivity } from './mockDb/schema';
import { useAuthStore } from '@/features/auth/store';
import { API_BASE_URL } from './config';

const delay = (ms = 800) => new Promise(resolve => setTimeout(resolve, ms));

const fetchWithTimeout = async (url: string, options: RequestInit & { timeout?: number } = {}) => {
  const { timeout = 2500, ...rest } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...rest, signal: controller.signal });
    clearTimeout(id);
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
            const res = await fetchWithTimeout(`${API_BASE_URL}/user/me`, {
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
  updateStudentProfile: async (userId: string, data: Partial<StudentProfile> & Record<string, any>): Promise<void> => {
    await delay();
    MockDB.updateStudentProfile(userId, data);
    
    // Sync domain/career goal and other fields with real backend via PUT /api/v1/user/me
    try {
        const token = localStorage.getItem('token');
        if (token) {
            const cachedDomainIds = localStorage.getItem('squrx_selected_domain_ids');
            const cachedEducationId = localStorage.getItem('squrx_selected_education_id');
            const cachedExperienceLevelId = localStorage.getItem('squrx_selected_experience_level_id');
            const cachedJobTypeIds = localStorage.getItem('squrx_selected_job_type_ids');
            const cachedSkillIds = localStorage.getItem('squrx_selected_skill_ids');
            const cachedLocationIds = localStorage.getItem('squrx_selected_location_ids');
            
            const savedProfileRaw = localStorage.getItem('squrx_onboarding_profile');
            let savedProfile: any = {};
            if (savedProfileRaw) {
                try {
                    savedProfile = JSON.parse(savedProfileRaw);
                } catch(e) {}
            }

            const payload: Record<string, any> = {};
            
            // Map fullName
            if (data.fullName !== undefined) {
                payload.fullName = data.fullName;
            } else if (savedProfile.fullName) {
                payload.fullName = savedProfile.fullName;
            }

            // Map mobile
            if (data.mobile !== undefined) {
                payload.mobile = data.mobile;
            } else if (data.phone !== undefined) {
                payload.mobile = data.phone;
            } else if (savedProfile.phone) {
                payload.mobile = savedProfile.phone;
            }

            // Map expectedSalary
            if (data.expectedSalary !== undefined) {
                payload.expectedSalary = data.expectedSalary;
            } else if (savedProfile.expectedSalary) {
                payload.expectedSalary = savedProfile.expectedSalary;
            }

            // Map currentSalary
            if (data.currentSalary !== undefined) {
                payload.currentSalary = data.currentSalary;
            } else if (savedProfile.currentSalary !== undefined) {
                payload.currentSalary = savedProfile.currentSalary;
            }

            // Map preferredDomains
            if (data.preferredDomains !== undefined) {
                payload.preferredDomains = data.preferredDomains;
            } else if (cachedDomainIds) {
                try {
                    payload.preferredDomains = JSON.parse(cachedDomainIds);
                } catch(e) {}
            }

            // Map education
            if (data.education !== undefined) {
                payload.education = data.education;
            } else if (cachedEducationId) {
                payload.education = cachedEducationId;
            }

            // Map experienceLevel
            if (data.experienceLevel !== undefined) {
                payload.experienceLevel = data.experienceLevel;
            } else if (cachedExperienceLevelId) {
                payload.experienceLevel = cachedExperienceLevelId;
            }
            
            // Map preferredJobTypes
            if (data.preferredJobTypes !== undefined) {
                payload.preferredJobTypes = data.preferredJobTypes;
            } else if (cachedJobTypeIds) {
                try {
                    payload.preferredJobTypes = JSON.parse(cachedJobTypeIds);
                } catch(e) {}
            }

            // Map skills
            if (data.skills !== undefined) {
                payload.skills = data.skills;
            } else if (cachedSkillIds) {
                try {
                    payload.skills = JSON.parse(cachedSkillIds);
                } catch(e) {}
            }

            // Map preferredLocations
            if (data.preferredLocations !== undefined) {
                payload.preferredLocations = data.preferredLocations;
            } else if (cachedLocationIds) {
                try {
                    payload.preferredLocations = JSON.parse(cachedLocationIds);
                } catch(e) {}
            }

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
