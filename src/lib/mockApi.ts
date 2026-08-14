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
                timeout: 15000
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
                    if (data.resume !== undefined) {
                        profile.cvUrl = data.resume;
                        profile.resume = data.resume;
                    } else if (data.cvUrl !== undefined) {
                        profile.cvUrl = data.cvUrl;
                        profile.resume = data.cvUrl;
                    }
                    if (data.cvName !== undefined) profile.cvName = data.cvName;
                    if (data.resumeName !== undefined) profile.resumeName = data.resumeName;
                    if (data.schoolLeavingCertificate !== undefined) profile.documentUrl = data.schoolLeavingCertificate;

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
                    if (Array.isArray(data.educationHistory)) {
                        profile.educationHistory = data.educationHistory;
                    } else {
                        profile.educationHistory = [];
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
                        const locNames = data.preferredLocations.map((l: any) => {
                            if (typeof l === 'string') return l;
                            const city = l.name || '';
                            let country = '';
                            if (l.country) {
                                country = typeof l.country === 'object' ? (l.country.name || '') : String(l.country);
                            } else if (l.countryName) {
                                country = String(l.countryName);
                            }
                            return country ? `${city} (${country})` : city;
                        }).filter(Boolean);
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

                    // Salary fields — preserve structured object shape { amount, currency } or null/string
                    if (data.expectedSalary !== undefined) profile.expectedSalary = data.expectedSalary;
                    if (data.currentSalary !== undefined) profile.currentSalary = data.currentSalary;

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

                    // Map all new fields from backend
                    // Map all candidate fields from backend
                    profile.gender = data.gender || '';
                    profile.dob = data.dob || '';
                    profile.currentLocation = data.currentLocation || '';
                    profile.hometown = data.hometown || '';
                    profile.hometownCountry = data.hometownCountry || '';

                    // languagesKnown[] — array of { language, proficiency, read, write, speak }
                    if (Array.isArray(data.languagesKnown)) {
                        profile.languagesKnown = data.languagesKnown.map((l: any) => ({
                            language: typeof l.language === 'object' && l.language ? l.language._id : (l.language || ''),
                            proficiency: typeof l.proficiency === 'object' && l.proficiency ? l.proficiency._id : (l.proficiency || ''),
                            read: l.read ?? false,
                            write: l.write ?? false,
                            speak: l.speak ?? false,
                            languageName: l.languageName || (typeof l.language === 'object' ? l.language.name : undefined),
                            proficiencyName: l.proficiencyName || (typeof l.proficiency === 'object' ? l.proficiency.name : undefined)
                        }));
                    } else if (Array.isArray(data.languages)) {
                        profile.languagesKnown = (data.languages as any[]).map((l: any) => ({
                            language: typeof l === 'string' ? l : (l._id || l.language || ''),
                            proficiency: typeof l.proficiency === 'object' && l.proficiency ? l.proficiency._id : (l.proficiency || ''),
                            read: l.read ?? false,
                            write: l.write ?? false,
                            speak: l.speak ?? false,
                            languageName: typeof l === 'object' ? (l.name || l.languageName) : l,
                            proficiencyName: l.proficiency?.name || l.proficiencyName
                        }));
                    } else {
                        profile.languagesKnown = [];
                    }

                    // employmentHistory[] — exact backend fields
                    if (Array.isArray(data.employmentHistory)) {
                        profile.employmentHistory = data.employmentHistory.map((e: any) => ({
                            employmentType: typeof e.employmentType === 'object' && e.employmentType ? e.employmentType._id : (e.employmentType || ''),
                            isCurrentEmployment: e.isCurrentEmployment ?? e.isCurrent ?? false,
                            totalExperienceYears: e.totalExperienceYears != null ? Number(e.totalExperienceYears) : undefined,
                            totalExperienceMonths: e.totalExperienceMonths != null ? Number(e.totalExperienceMonths) : undefined,
                            companyName: e.companyName || e.company || '',
                            jobTitle: e.jobTitle || e.role || '',
                            joiningDate: e.joiningDate || e.startDate || '',
                            currentSalary: e.currentSalary != null ? String(e.currentSalary) : '',
                            skillsUsed: Array.isArray(e.skillsUsed) ? e.skillsUsed : [],
                            jobProfile: e.jobProfile || e.description || '',
                            noticePeriod: e.noticePeriod || ''
                        }));
                    } else {
                        profile.employmentHistory = [];
                    }

                    profile.certifications = Array.isArray(data.certifications) ? data.certifications : [];
                    profile.awards = data.awards || '';

                    // projects[] — exact backend fields (title, tag, client, status: "Ongoing"|"Completed", details, projectSite, teamSize, role, etc.)
                    if (Array.isArray(data.projects)) {
                        profile.projects = data.projects.map((p: any) => ({
                            title: p.title || '',
                            tag: p.tag || '',
                            client: p.client || '',
                            status: p.status === 'Completed' || p.status === 'completed' ? 'Completed' : 'Ongoing',
                            workedFromYear: p.workedFromYear != null ? Number(p.workedFromYear) : undefined,
                            workedFromMonth: p.workedFromMonth != null ? Number(p.workedFromMonth) : undefined,
                            workedTillYear: p.workedTillYear != null ? Number(p.workedTillYear) : undefined,
                            workedTillMonth: p.workedTillMonth != null ? Number(p.workedTillMonth) : undefined,
                            details: p.details || p.description || '',
                            location: p.location || '',
                            projectSite: p.projectSite || 'Onsite',
                            natureOfEmployment: typeof p.natureOfEmployment === 'object' && p.natureOfEmployment ? p.natureOfEmployment._id : (p.natureOfEmployment || ''),
                            teamSize: p.teamSize || undefined,
                            role: typeof p.role === 'object' && p.role ? p.role._id : (p.role || ''),
                            roleDescription: p.roleDescription || '',
                            skillsUsed: p.skillsUsed || ''
                        }));
                    } else {
                        profile.projects = [];
                    }

                    profile.internships = Array.isArray(data.internships) ? data.internships : [];
                    profile.profileSummary = data.profileSummary || '';
                    profile.otherAchievements = data.otherAchievements || '';

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

            const isValidObjectId = (id: any): boolean => {
                return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
            };

            const formatSalaryPayload = (sal: any) => {
                if (!sal) return null;
                if (typeof sal === 'object') {
                    if (sal.amount === null || sal.amount === undefined || sal.amount === '') return null;
                    const rawCurr = typeof sal.currency === 'object' && sal.currency ? sal.currency._id : sal.currency;
                    const validCurr = isValidObjectId(rawCurr) ? rawCurr : null;
                    const resObj: Record<string, any> = { amount: Number(sal.amount) };
                    if (validCurr) resObj.currency = validCurr;
                    return resObj;
                }
                return sal;
            };

            if (data.gdprConsent !== undefined) payload.gdprConsent = data.gdprConsent;
            if (data.fullName !== undefined) payload.fullName = data.fullName;
            if (data.mobile !== undefined) payload.mobile = data.mobile;
            else if (data.phone !== undefined) payload.mobile = data.phone;
            
            if (data.expectedSalary !== undefined) {
                payload.expectedSalary = formatSalaryPayload(data.expectedSalary);
            }
            if (data.currentSalary !== undefined) {
                payload.currentSalary = formatSalaryPayload(data.currentSalary);
            }

            // Business rule: If Fresher is selected, force-clear currentSalary to null
            const isFresher = data.experienceLevel === 'Fresher' || data.experienceLevelId === 'Fresher';
            if (isFresher) {
                payload.currentSalary = null;
            }

            if (data.preferredDomains !== undefined) {
                payload.preferredDomains = Array.isArray(data.preferredDomains) ? data.preferredDomains.filter(isValidObjectId) : [];
            }
            
            if (data.educationHistory !== undefined) {
                payload.educationHistory = Array.isArray(data.educationHistory) ? data.educationHistory.map((item: any) => {
                    const edu: Record<string, any> = {};
                    if (isValidObjectId(item.education)) edu.education = item.education;
                    if (isValidObjectId(item.university)) edu.university = item.university;
                    if (isValidObjectId(item.course)) edu.course = item.course;
                    if (isValidObjectId(item.specialization)) edu.specialization = item.specialization;
                    if (item.courseType) edu.courseType = item.courseType;
                    if (item.passingYear != null && item.passingYear !== '') edu.passingYear = Number(item.passingYear);
                    if (item.gradingSystem) edu.gradingSystem = item.gradingSystem;
                    if (item.marks != null && item.marks !== '') edu.marks = Number(item.marks);
                    return edu;
                }) : [];
            }

            if (isValidObjectId(data.experienceLevelId)) {
                payload.experienceLevel = data.experienceLevelId;
            } else if (isValidObjectId(data.experienceLevel)) {
                payload.experienceLevel = data.experienceLevel;
            }

            if (data.preferredJobTypes !== undefined) {
                payload.preferredJobTypes = Array.isArray(data.preferredJobTypes) ? data.preferredJobTypes.filter(isValidObjectId) : [];
            }
            if (data.skills !== undefined) {
                payload.skills = Array.isArray(data.skills) ? data.skills.filter(isValidObjectId) : [];
            }
            if (data.preferredLocations !== undefined) {
                payload.preferredLocations = Array.isArray(data.preferredLocations) ? data.preferredLocations.filter(isValidObjectId) : [];
            }
            if (data.cvUrl !== undefined) payload.resume = data.cvUrl;
            if (data.resume !== undefined) payload.resume = data.resume;
            if (data.cvName !== undefined) payload.cvName = data.cvName;
            if (data.resumeName !== undefined) payload.resumeName = data.resumeName;

            // Format Date of Birth (dob) as valid ISO YYYY-MM-DD date string
            const formatDobPayload = (dobVal: any) => {
                if (!dobVal || typeof dobVal !== 'string' || !dobVal.trim()) return undefined;
                const trimmed = dobVal.trim();
                if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
                    const [day, month, year] = trimmed.split('/');
                    const isoStr = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                    const d = new Date(isoStr);
                    return !isNaN(d.getTime()) ? isoStr : undefined;
                }
                const d = new Date(trimmed);
                if (!isNaN(d.getTime())) {
                    return d.toISOString().split('T')[0];
                }
                return undefined;
            };

            // Sync candidate fields with backend using exact property names
            if (data.gender && data.gender.trim()) payload.gender = data.gender.trim();
            const dobFormatted = formatDobPayload(data.dob);
            if (dobFormatted) payload.dob = dobFormatted;
            if (data.currentLocation && data.currentLocation.trim()) payload.currentLocation = data.currentLocation.trim();
            if (data.hometown && data.hometown.trim()) payload.hometown = data.hometown.trim();
            if (isValidObjectId(data.hometownCountry)) payload.hometownCountry = data.hometownCountry;

            // languagesKnown[] — array of { language, proficiency, read, write, speak }
            if (data.languagesKnown !== undefined) {
                payload.languagesKnown = Array.isArray(data.languagesKnown) ? data.languagesKnown
                    .filter((l: any) => isValidObjectId(l.language) && isValidObjectId(l.proficiency))
                    .map((l: any) => ({
                        language: l.language,
                        proficiency: l.proficiency,
                        read: !!l.read,
                        write: !!l.write,
                        speak: !!l.speak
                    })) : [];
            }

            // employmentHistory[] — exact backend structure
            if (data.employmentHistory !== undefined) {
                payload.employmentHistory = Array.isArray(data.employmentHistory) ? data.employmentHistory.map((e: any) => {
                    const emp: Record<string, any> = {
                        isCurrentEmployment: !!e.isCurrentEmployment,
                        companyName: e.companyName || '',
                        jobTitle: e.jobTitle || '',
                        joiningDate: e.joiningDate || '',
                        currentSalary: e.currentSalary != null ? String(e.currentSalary) : '',
                        skillsUsed: Array.isArray(e.skillsUsed) ? e.skillsUsed.filter(isValidObjectId) : [],
                        jobProfile: e.jobProfile || '',
                        noticePeriod: e.noticePeriod || ''
                    };
                    if (isValidObjectId(e.employmentType)) {
                        emp.employmentType = e.employmentType;
                    }
                    if (e.totalExperienceYears != null && e.totalExperienceYears !== '') emp.totalExperienceYears = Number(e.totalExperienceYears);
                    if (e.totalExperienceMonths != null && e.totalExperienceMonths !== '') emp.totalExperienceMonths = Number(e.totalExperienceMonths);
                    return emp;
                }) : [];
            }

            if (data.certifications !== undefined) payload.certifications = data.certifications;
            if (data.awards !== undefined) payload.awards = data.awards;

            // projects[] — exact backend structure: title, tag, client, status ('Ongoing'|'Completed'), details, location, projectSite, teamSize, role, etc.
            if (data.projects !== undefined) {
                payload.projects = Array.isArray(data.projects) ? data.projects.map((p: any) => {
                    const proj: Record<string, any> = {
                        title: p.title || '',
                        status: p.status === 'Completed' ? 'Completed' : 'Ongoing',
                        details: p.details || ''
                    };
                    if (p.tag) proj.tag = p.tag;
                    if (p.client) proj.client = p.client;
                    if (p.workedFromYear != null && p.workedFromYear !== '') proj.workedFromYear = Number(p.workedFromYear);
                    if (p.workedFromMonth != null && p.workedFromMonth !== '') proj.workedFromMonth = Number(p.workedFromMonth);
                    if (p.workedTillYear != null && p.workedTillYear !== '') proj.workedTillYear = Number(p.workedTillYear);
                    if (p.workedTillMonth != null && p.workedTillMonth !== '') proj.workedTillMonth = Number(p.workedTillMonth);
                    if (p.location) proj.location = p.location;
                    if (p.projectSite) proj.projectSite = p.projectSite;
                    if (isValidObjectId(p.natureOfEmployment)) proj.natureOfEmployment = p.natureOfEmployment;
                    if (p.teamSize) proj.teamSize = p.teamSize;
                    if (isValidObjectId(p.role)) proj.role = p.role;
                    if (p.roleDescription) proj.roleDescription = p.roleDescription;
                    if (p.skillsUsed) proj.skillsUsed = p.skillsUsed;
                    return proj;
                }) : [];
            }

            if (data.internships !== undefined) payload.internships = data.internships;
            if (data.profileSummary !== undefined) payload.profileSummary = data.profileSummary;
            if (data.otherAchievements !== undefined) payload.otherAchievements = data.otherAchievements;

            const res = await fetchWithTimeout(`${API_BASE_URL}/user/me`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload),
                timeout: 15000
            });

            if (!res.ok) {
                const errJson = await res.json().catch(() => ({}));
                console.error("Backend PUT /user/me Error Response:", errJson);
                let errMsg = errJson.message || errJson.error || '';
                if (errJson.errors) {
                    if (typeof errJson.errors === 'object') {
                        const detailStr = Object.entries(errJson.errors)
                            .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
                            .join(', ');
                        errMsg = errMsg ? `${errMsg} (${detailStr})` : detailStr;
                    } else {
                        errMsg = errMsg ? `${errMsg} (${errJson.errors})` : String(errJson.errors);
                    }
                }
                if (!errMsg) errMsg = `PUT /user/me failed with status ${res.status}`;
                throw new Error(errMsg);
            }
        }
    } catch(e: any) {
        console.error("Failed to sync profile update with backend:", e);
        throw e;
    }
  },

  /**
   * Upload a CV/resume (.pdf, .doc, .docx) to backend via POST /user/me/resume (multipart/form-data).
   */
  uploadResume: async (file: File): Promise<string | null> => {
    const token = getInMemToken();
    if (!token) throw new Error('Not authenticated');
    
    const lowerName = file.name.toLowerCase();
    let mimeType = file.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (lowerName.endsWith('.pdf')) mimeType = 'application/pdf';
      else if (lowerName.endsWith('.doc')) mimeType = 'application/msword';
      else if (lowerName.endsWith('.docx')) mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }

    const normalizedFile = new File([file], file.name, { type: mimeType });
    const formData = new FormData();
    formData.append('resume', normalizedFile);

    const res = await fetch(`${API_BASE_URL}/user/me/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `Resume upload failed (${res.status})`);
    }
    const json = await res.json();
    return json.data?.resume || null;
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
