import { MockDB } from './mockDb';
import type { User, StudentProfile, CompanyProfile, JobVacancy, JobApplication, ConsultationBooking, SystemActivity } from './mockDb/schema';
import { API_BASE_URL } from './config';
import { getInMemToken } from '@/features/auth/store';
import { normalizeInternshipItem, saveStoredInternships, getStoredInternships } from './internshipsStorage';


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

/**
 * Normalizes a joiningDate string for user display.
 * Recovers corrupted year data from MongoDB Date parsing:
 * e.g., numeric string "2023" parsed by Mongoose as 2023ms yields "1970-01-01T00:00:02.023Z",
 * which getTime() = 2023 recovers into "2023".
 * Also strips "YYYY-01-01T00:00:00.000Z" to "YYYY" if it was originally just a year.
 */
export function formatJoiningDateDisplay(rawDate: any): string {
  if (!rawDate) return '';
  const str = String(rawDate).trim();
  if (!str) return '';

  // 4-digit year like "2023"
  if (/^\d{4}$/.test(str)) {
    return str;
  }

  // Check if it was parsed as epoch milliseconds (e.g. 1970-01-01T00:00:02.023Z -> 2023)
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    if (d.getUTCFullYear() === 1970) {
      const ms = d.getTime();
      if (ms >= 1900 && ms <= 2100) {
        return String(ms);
      }
    }
    // If it's Jan 1 00:00:00.000Z (standard default date when only year is stored)
    if (d.getUTCMonth() === 0 && d.getUTCDate() === 1 && d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0) {
      return String(d.getUTCFullYear());
    }
    // If it's a valid date, return formatted YYYY-MM or YYYY-MM-DD
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    if (day === '01') {
      return `${y}-${m}`;
    }
    return `${y}-${m}-${day}`;
  }

  return str;
}

/**
 * Normalizes a joiningDate string before sending to backend in PUT /user/me payload.
 * Prevents Mongoose from treating 4-digit year "2023" as 2023ms (which produces 1970-01-01T00:00:02.023Z).
 */
export function formatJoiningDatePayload(raw: any): string {
  if (!raw) return '';
  const str = String(raw).trim();
  if (!str) return '';

  // If epoch corruption string was somehow passed in, recover year first
  const d = new Date(str);
  if (!isNaN(d.getTime()) && d.getUTCFullYear() === 1970) {
    const ms = d.getTime();
    if (ms >= 1900 && ms <= 2100) {
      return `${ms}-01-01`;
    }
  }

  // 4-digit year "2023" -> "2023-01-01"
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  // "YYYY-MM" -> "YYYY-MM-01"
  if (/^\d{4}-\d{2}$/.test(str)) {
    return `${str}-01`;
  }

  // "MM/YYYY" -> "YYYY-MM-01"
  const slashMatch = str.match(/^(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const m = slashMatch[1].padStart(2, '0');
    const y = slashMatch[2];
    return `${y}-${m}-01`;
  }

  // If valid Date, return ISO string
  if (!isNaN(d.getTime())) {
    return d.toISOString();
  }

  return str;
}

/**
 * Normalizes any joiningDate string to YYYY-MM-DD format for HTML5 <input type="date"> elements.
 * Handles 4-digit year "2023" -> "2023-01-01", epoch milliseconds "1970-01-01T00:00:02.023Z" -> "2023-01-01",
 * and ISO timestamps "2001-05-31T00:00:00.000Z" -> "2001-05-31".
 */
export function toDateInputValue(val?: any): string {
  if (!val) return '';
  const str = String(val).trim();
  if (!str) return '';

  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // 4-digit year like "2023"
  if (/^\d{4}$/.test(str)) {
    return `${str}-01-01`;
  }

  // YYYY-MM
  if (/^\d{4}-\d{2}$/.test(str)) {
    return `${str}-01`;
  }

  // Parse as Date
  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    if (d.getUTCFullYear() === 1970) {
      const ms = d.getTime();
      if (ms >= 1900 && ms <= 2100) {
        return `${ms}-01-01`;
      }
    }
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  return '';
}

/**
 * Determines if a certification is considered completed.
 * Returns true if status is case-insensitively 'completed', or if a completion ID is present.
 */
export function isCertificationCompleted(c: any): boolean {
  if (!c) return false;
  const s = String(c.status || '').trim().toLowerCase();
  if (s === 'completed') return true;
  if (c.completionId && String(c.completionId).trim().length > 0) return true;
  return false;
}

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
                    console.log('[SQURX DEBUG] GET /user/me response data:', JSON.stringify({
                        gender: data.gender,
                        dob: data.dob,
                        currentLocation: data.currentLocation,
                        hometown: data.hometown,
                        hometownCountry: data.hometownCountry,
                        languagesKnown: data.languagesKnown,
                        profileSummary: data.profileSummary,
                        educationHistory: data.educationHistory?.length,
                        employmentHistory: data.employmentHistory?.length,
                        certifications: data.certifications?.length,
                        awards: data.awards,
                        projects: data.projects?.length,
                        internships: data.internships?.length,
                        otherAchievements: data.otherAchievements,
                    }, null, 2));
                    // Ensure we have a profile object to populate
                    if (!profile) {
                        // First visit: create a baseline profile in MockDB
                        MockDB.updateStudentProfile(userId, {});
                        profile = MockDB.getStudentProfile(userId) as StudentProfile;
                    }

                    // ── Backend is the source of truth for all fields below ──

                    // CV / document URLs
                    const isCvDeleted = typeof window !== 'undefined' && localStorage.getItem(`squrx_deleted_cv_${userId}`) === 'true';
                    if (isCvDeleted) {
                        console.log('[mockApi] getStudentProfile: CV was explicitly deleted by user, keeping null');
                        profile.cvUrl = null;
                        profile.resume = null;
                        profile.cvName = null;
                        profile.resumeName = null;
                    } else {
                        const backendResume = data.resume !== undefined ? data.resume : data.cvUrl;
                        if (backendResume && typeof backendResume === 'string' && backendResume.trim().length > 0) {
                            profile.cvUrl = backendResume.trim();
                            profile.resume = backendResume.trim();
                            if (data.cvName) profile.cvName = data.cvName;
                            if (data.resumeName) profile.resumeName = data.resumeName;
                        } else {
                            // Explicitly clear CV if backend has empty/null/missing resume
                            profile.cvUrl = null;
                            profile.resume = null;
                            profile.cvName = null;
                            profile.resumeName = null;
                        }
                    }
                    if (data.schoolLeavingCertificate !== undefined) profile.documentUrl = data.schoolLeavingCertificate;

                    // Domain / career goal + domain ID
                    const domainObj = data.preferredDomain || data.domain;
                    if (domainObj?.name) {
                        profile.careerGoal = domainObj.name;
                    } else if (typeof domainObj === 'string' && domainObj) {
                        if (/^[0-9a-fA-F]{24}$/.test(domainObj)) {
                            profile.preferredDomainIds = [domainObj];
                        } else {
                            profile.careerGoal = domainObj;
                        }
                    } else if (data.customDomain) {
                        profile.careerGoal = data.customDomain;
                    }
                    // Separate Primary Domain & Custom Domain
                    if (data.domain) {
                        profile.domain = typeof data.domain === 'object' && data.domain ? (data.domain._id || data.domain.name) : data.domain;
                    }
                    if (data.customDomain !== undefined) {
                        profile.customDomain = data.customDomain || '';
                    }
                    // Store domain IDs directly on profile (no sessionStorage)
                    if (domainObj?._id) {
                        profile.preferredDomainIds = [domainObj._id];
                    } else if (Array.isArray(data.preferredDomains) && data.preferredDomains.length > 0) {
                        profile.preferredDomainIds = data.preferredDomains
                            .map((d: any) => (typeof d === 'string' ? d : (d._id || null)))
                            .filter(Boolean);
                    }
                    if (Array.isArray(data.educationHistory) && data.educationHistory.length > 0) {
                        profile.educationHistory = data.educationHistory.map((item: any, idx: number) => {
                            const existingEdu = profile?.educationHistory?.[idx];
                            const eduId = typeof item.education === 'object' && item.education ? (item.education._id || '') : (item.education || '');
                            const eduName = typeof item.education === 'object' && item.education ? (item.education.name || '') : '';
                            const uniId = typeof item.university === 'object' && item.university ? (item.university._id || '') : (item.university || '');
                            const uniName = typeof item.university === 'object' && item.university ? (item.university.name || '') : '';
                            const courseId = typeof item.course === 'object' && item.course ? (item.course._id || '') : (item.course || '');
                            const courseName = typeof item.course === 'object' && item.course ? (item.course.name || '') : '';
                            const specId = typeof item.specialization === 'object' && item.specialization ? (item.specialization._id || '') : (item.specialization || '');
                            const specName = typeof item.specialization === 'object' && item.specialization ? (item.specialization.name || '') : '';

                            let ct = item.courseType || 'Full Time';
                            const ctLower = String(ct).toLowerCase().replace(/[-_]/g, ' ').trim();
                            if (ctLower.includes('part')) ct = 'Part Time';
                            else if (ctLower.includes('distance')) ct = 'Distance Learning';
                            else if (ctLower.includes('correspondence')) ct = 'Correspondence';
                            else ct = 'Full Time';

                            let schoolCollegeName = item.schoolCollegeName || item.college || item.institute || item.school || data.schoolCollegeName || existingEdu?.schoolCollegeName || '';
                            if (!schoolCollegeName && item.customUniversity && uniName && item.customUniversity.trim().toLowerCase() !== uniName.trim().toLowerCase()) {
                                schoolCollegeName = item.customUniversity.trim();
                            }

                            return {
                                _id: item._id,
                                education: eduId,
                                customEducation: item.customEducation || eduName || existingEdu?.customEducation || '',
                                university: uniId,
                                customUniversity: item.customUniversity || uniName || existingEdu?.customUniversity || '',
                                course: courseId,
                                customCourse: item.customCourse || courseName || existingEdu?.customCourse || '',
                                specialization: specId,
                                customSpecialization: item.customSpecialization || specName || existingEdu?.customSpecialization || '',
                                schoolCollegeName: schoolCollegeName,
                                college: schoolCollegeName,
                                institute: schoolCollegeName,
                                courseType: ct,
                                startYear: item.startYear || '',
                                endYear: item.endYear || item.passingYear || '',
                                passingYear: item.passingYear || item.endYear || '',
                                gradingSystem: item.gradingSystem || 'CGPA',
                                gradingValue: item.gradingValue || item.marks || '',
                                marks: item.marks || item.gradingValue || ''
                            };
                        });
                    } else if (data.education && typeof data.education === 'object' && Object.keys(data.education).length > 0) {
                        const item = data.education;
                        const existingEdu = profile.educationHistory?.[0];
                        const eduId = typeof item.education === 'object' && item.education ? (item.education._id || '') : (item.education || item._id || '');
                        const eduName = typeof item.education === 'object' && item.education ? (item.education.name || '') : (item.name || '');
                        const uniId = typeof item.university === 'object' && item.university ? (item.university._id || '') : (item.university || '');
                        const uniName = typeof item.university === 'object' && item.university ? (item.university.name || '') : '';
                        const courseId = typeof item.course === 'object' && item.course ? (item.course._id || '') : (item.course || '');
                        const courseName = typeof item.course === 'object' && item.course ? (item.course.name || '') : '';
                        const specId = typeof item.specialization === 'object' && item.specialization ? (item.specialization._id || '') : (item.specialization || '');
                        const specName = typeof item.specialization === 'object' && item.specialization ? (item.specialization.name || '') : '';
                        let schoolCollegeName = item.schoolCollegeName || item.college || item.institute || item.school || data.schoolCollegeName || existingEdu?.schoolCollegeName || '';
                        if (!schoolCollegeName && item.customUniversity && uniName && item.customUniversity.trim().toLowerCase() !== uniName.trim().toLowerCase()) {
                            schoolCollegeName = item.customUniversity.trim();
                        }

                        profile.educationHistory = [{
                            _id: item._id || 'edu-0',
                            education: eduId,
                            customEducation: item.customEducation || eduName || existingEdu?.customEducation || '',
                            university: uniId,
                            customUniversity: item.customUniversity || uniName || existingEdu?.customUniversity || '',
                            course: courseId,
                            customCourse: item.customCourse || courseName || existingEdu?.customCourse || '',
                            specialization: specId,
                            customSpecialization: item.customSpecialization || specName || existingEdu?.customSpecialization || '',
                            schoolCollegeName: schoolCollegeName,
                            college: schoolCollegeName,
                            institute: schoolCollegeName,
                            courseType: item.courseType || 'Full Time',
                            startYear: item.startYear || '',
                            endYear: item.endYear || item.passingYear || '',
                            passingYear: item.passingYear || item.endYear || '',
                            gradingSystem: item.gradingSystem || 'CGPA',
                            gradingValue: item.gradingValue || item.marks || '',
                            marks: item.marks || item.gradingValue || ''
                        }];
                    } else {
                        profile.educationHistory = [];
                    }

                    profile.schoolCollegeName = data.schoolCollegeName || profile.educationHistory?.[0]?.schoolCollegeName || '';
                    profile.highestEducation = data.highestEducation || '';
                    profile.ugUniversity = data.ugUniversity || '';
                    profile.pgUniversity = data.pgUniversity || '';
                    profile.graduationUniversity = data.graduationUniversity || '';

                    // Experience level
                    // Backend may return a populated object { _id, name } or a raw ObjectID string.
                    // Only set the display name when we have a populated object; otherwise store the ID
                    // so the component can resolve it against the experienceLevels API cache.
                    if (data.experienceLevel?.name) {
                        profile.experienceLevel = data.experienceLevel.name;
                        profile.experienceLevelId = data.experienceLevel._id || '';
                    } else if (typeof data.experienceLevel === 'string' && data.experienceLevel) {
                        const isObjectId = /^[0-9a-fA-F]{24}$/.test(data.experienceLevel);
                        if (isObjectId) {
                            // Store only the ID — DO NOT set experienceLevel to a raw hex string
                            profile.experienceLevelId = data.experienceLevel;
                            // Leave profile.experienceLevel unchanged (may have a previous name or empty)
                        } else {
                            // Plain text like "Fresher" — use as-is
                            profile.experienceLevel = data.experienceLevel;
                        }
                    }

                    // Skills (array of objects or strings)
                    // Backend may return populated objects [{ _id, name }] or raw ObjectID strings.
                    // Extract names from objects; for raw ID strings, store separately so the component
                    // can resolve them against the skills API cache.
                    if (Array.isArray(data.skills) && data.skills.length > 0) {
                        const resolvedNames: string[] = [];
                        const unresolvedIds: string[] = [];
                        for (const s of data.skills) {
                            if (typeof s === 'string') {
                                if (/^[0-9a-fA-F]{24}$/.test(s)) {
                                    unresolvedIds.push(s);
                                } else if (s) {
                                    resolvedNames.push(s);
                                }
                            } else if (s && typeof s === 'object') {
                                if (s.name) resolvedNames.push(s.name);
                                if (s._id) unresolvedIds.push(s._id);
                            }
                        }
                        // If we have human-readable names, use them; otherwise keep IDs for component resolution
                        profile.skills = resolvedNames.length > 0 ? resolvedNames : unresolvedIds;
                        // Always store the raw IDs so the profile page can match against the skills API
                        if (unresolvedIds.length > 0) {
                            (profile as any).skillIds = unresolvedIds;
                        }
                    }

                    // Preferred locations — store IDs directly in profile (no sessionStorage)
                    if (Array.isArray(data.preferredLocations) && data.preferredLocations.length > 0) {
                        const locNames = data.preferredLocations.map((l: any) => {
                            if (typeof l === 'string') {
                                if (/^[0-9a-fA-F]{24}$/.test(l)) return null;
                                return l;
                            }
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
                            .map((l: any) => {
                                if (typeof l === 'string') {
                                    return /^[0-9a-fA-F]{24}$/.test(l) ? l : null;
                                }
                                return l._id || null;
                            })
                            .filter(Boolean);
                        if (locIds.length > 0) {
                            profile.preferredLocationIds = locIds;
                        }
                    }

                    // Preferred job types — store IDs directly in profile (no sessionStorage)
                    if (Array.isArray(data.preferredJobTypes) && data.preferredJobTypes.length > 0) {
                        const jtNames = data.preferredJobTypes.map((j: any) => {
                            if (typeof j === 'string') {
                                if (/^[0-9a-fA-F]{24}$/.test(j)) return null;
                                return j;
                            }
                            return j.name || '';
                        }).filter(Boolean);
                        if (jtNames.length > 0) {
                            profile.jobTypes = jtNames;
                            profile.jobType = jtNames.join(', ');
                        }
                        const jtIds = data.preferredJobTypes
                            .map((j: any) => {
                                if (typeof j === 'string') {
                                    return /^[0-9a-fA-F]{24}$/.test(j) ? j : null;
                                }
                                return j._id || null;
                            })
                            .filter(Boolean);
                        if (jtIds.length > 0) {
                            profile.preferredJobTypeIds = jtIds;
                        }
                    }

                    // Salary fields — preserve structured object shape { amount, currency } or null/string
                    if (data.expectedSalary !== undefined) profile.expectedSalary = data.expectedSalary;
                    if (data.currentSalary !== undefined) profile.currentSalary = data.currentSalary;

                    // Full name, contact & email
                    if (data.fullName) profile.fullName = data.fullName;
                    if (data.mobile) profile.mobile = data.mobile;
                    if (data.phone) profile.phone = data.phone;
                    if (data.email) profile.email = data.email;
                    if (data.countryCode) (profile as any).countryCode = data.countryCode;
                    if (data.country) (profile as any).country = data.country;
                    if (data.isVerified !== undefined) (profile as any).isVerified = data.isVerified;

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
                    // Hometown Country — backend may return populated object { _id, name } or raw ObjectId string
                    if (data.hometownCountry) {
                        if (typeof data.hometownCountry === 'object' && data.hometownCountry) {
                            profile.hometownCountry = data.hometownCountry.name || '';
                            profile.hometownCountryId = data.hometownCountry._id || '';
                        } else if (typeof data.hometownCountry === 'string') {
                            if (/^[0-9a-fA-F]{24}$/.test(data.hometownCountry.trim())) {
                                profile.hometownCountryId = data.hometownCountry.trim();
                                profile.hometownCountry = '';
                            } else {
                                profile.hometownCountry = data.hometownCountry.trim();
                            }
                        }
                    } else {
                        profile.hometownCountry = '';
                    }
                    if (data.hometownCountryId && !profile.hometownCountryId) {
                        profile.hometownCountryId = data.hometownCountryId;
                    }

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
                            joiningDate: formatJoiningDateDisplay(e.joiningDate || e.startDate || ''),
                            currentSalary: typeof e.currentSalary === 'object' && e.currentSalary ? {
                                amount: e.currentSalary.amount != null ? Number(e.currentSalary.amount) : null,
                                currency: typeof e.currentSalary.currency === 'object' && e.currentSalary.currency ? e.currentSalary.currency : (e.currentSalary.currency || null)
                            } : (e.currentSalary != null && e.currentSalary !== '' ? (isNaN(Number(e.currentSalary)) ? String(e.currentSalary) : { amount: Number(e.currentSalary), currency: null }) : null),
                            skillsUsed: Array.isArray(e.skillsUsed)
                                ? e.skillsUsed.map((s: any) => typeof s === 'object' && s ? (s.name || s._id) : String(s)).filter(Boolean)
                                : (typeof e.skillsUsed === 'string' && e.skillsUsed.trim() ? e.skillsUsed.split(',').map((s: string) => s.trim()).filter(Boolean) : []),
                            jobProfile: e.jobProfile || e.description || '',
                            noticePeriod: e.noticePeriod || ''
                        }));
                    } else {
                        profile.employmentHistory = [];
                    }

                    profile.certifications = Array.isArray(data.certifications) ? data.certifications.map((c: any) => ({
                        _id: c._id,
                        name: c.name || '',
                        status: isCertificationCompleted(c) ? 'Completed' : 'Undergoing',
                        doesNotExpire: !!c.doesNotExpire,
                        completionId: c.completionId || '',
                        url: c.url || '',
                        validFromMonth: c.validFromMonth != null ? c.validFromMonth : '',
                        validFromYear: c.validFromYear != null ? c.validFromYear : '',
                        validToMonth: c.validToMonth != null ? c.validToMonth : '',
                        validToYear: c.validToYear != null ? c.validToYear : ''
                    })) : [];
                    profile.awards = Array.isArray(data.awards)
                        ? data.awards.map((a: any) => typeof a === 'string' ? a : (a?.title || a?.name || JSON.stringify(a))).join('\n')
                        : (data.awards || '');

                    // projects[] — exact backend fields (title, tag, client, status: "Ongoing"|"Completed", details, projectSite, teamSize, role, etc.)
                    if (Array.isArray(data.projects) && data.projects.length > 0) {
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
                            skillsUsed: Array.isArray(p.skillsUsed) ? p.skillsUsed.join(', ') : (p.skillsUsed || '')
                        }));
                        try {
                            if (typeof window !== 'undefined') {
                                localStorage.setItem(`squrx_projects_${userId}`, JSON.stringify(profile.projects));
                            }
                        } catch {}
                    } else {
                        let localProjects: any[] | null = null;
                        try {
                            if (typeof window !== 'undefined') {
                                const stored = localStorage.getItem(`squrx_projects_${userId}`);
                                if (stored) localProjects = JSON.parse(stored);
                            }
                        } catch {}

                        if (Array.isArray(localProjects) && localProjects.length > 0) {
                            profile.projects = localProjects;
                        } else if (Array.isArray(profile.projects) && profile.projects.length > 0) {
                            try {
                                if (typeof window !== 'undefined') {
                                    localStorage.setItem(`squrx_projects_${userId}`, JSON.stringify(profile.projects));
                                }
                            } catch {}
                        } else if (Array.isArray(data.projects)) {
                            profile.projects = [];
                        } else {
                            profile.projects = profile.projects || [];
                        }
                    }

                    const backendInternships = Array.isArray(data.internships) && data.internships.length > 0
                        ? data.internships
                        : (Array.isArray(data.internship) && data.internship.length > 0 ? data.internship : null);

                    if (backendInternships) {
                        const normalizedInternships = backendInternships.map(normalizeInternshipItem);
                        profile.internships = normalizedInternships;
                        saveStoredInternships(userId, normalizedInternships);
                    } else {
                        // Backend did not return internships (or returned empty array).
                        // Restore from localStorage backup or preserve existing MockDB internships so user data is never lost!
                        const localInternships = getStoredInternships(userId);
                        if (Array.isArray(localInternships) && localInternships.length > 0) {
                            profile.internships = localInternships;
                            saveStoredInternships(userId, localInternships);
                        } else if (Array.isArray(profile.internships) && profile.internships.length > 0) {
                            profile.internships = profile.internships.map(normalizeInternshipItem);
                            saveStoredInternships(userId, profile.internships);
                        } else {
                            profile.internships = [];
                        }
                    }
                    profile.profileSummary = data.profileSummary || '';
                    if (Array.isArray(data.otherAchievements)) {
                        profile.otherAchievements = data.otherAchievements.map((a: any) => {
                            if (typeof a === 'string') return { name: a, link: '', description: '' };
                            return {
                                _id: a._id,
                                name: a.name || a.title || '',
                                link: a.link || a.url || '',
                                description: a.description || a.details || ''
                            };
                        });
                    } else if (typeof data.otherAchievements === 'string' && data.otherAchievements.trim()) {
                        profile.otherAchievements = data.otherAchievements.split('\n').filter(Boolean).map((s: string) => ({ name: s, link: '', description: '' }));
                    } else {
                        profile.otherAchievements = [];
                    }

                    // Persist synced data back to local MockDB cache
                    MockDB.updateStudentProfile(userId, profile);
                }
            }
        }
    } catch(e) {
        console.error("Failed to fetch real profile data from /user/me", e);
    }
    // Final check: if profile.internships or profile.projects are still empty, restore from localStorage if available
    if (profile && (!profile.internships || profile.internships.length === 0)) {
        const stored = getStoredInternships(userId);
        if (Array.isArray(stored) && stored.length > 0) {
            profile.internships = stored;
        }
    }
    if (profile && (!profile.projects || profile.projects.length === 0)) {
        try {
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem(`squrx_projects_${userId}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        profile.projects = parsed;
                    }
                }
            }
        } catch {}
    }
    return profile;
  },

  updateStudentProfile: async (userId: string, data: Partial<StudentProfile> & Record<string, any>): Promise<void> => {
    await delay();
    if (data.internships !== undefined || data.internship !== undefined) {
        const rawList = Array.isArray(data.internships) ? data.internships : (Array.isArray(data.internship) ? data.internship : []);
        const cleanedInternships = rawList
            .filter((i: any) => i && (i.companyName?.trim() || i.company?.trim() || i.role?.trim() || i.title?.trim() || i.duration?.trim()))
            .map(normalizeInternshipItem);
        saveStoredInternships(userId, cleanedInternships);
        data = { ...data, internships: cleanedInternships };
    }
    if (data.projects !== undefined && Array.isArray(data.projects)) {
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem(`squrx_projects_${userId}`, JSON.stringify(data.projects));
            }
        } catch {}
    }
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

            if (data.domain !== undefined) {
                if (isValidObjectId(data.domain)) {
                    payload.domain = data.domain;
                } else if (typeof data.domain === 'object' && data.domain?._id && isValidObjectId(data.domain._id)) {
                    payload.domain = data.domain._id;
                }
            }
            if (data.customDomain !== undefined) {
                payload.customDomain = data.customDomain;
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
                    if (item.customEducation) edu.customEducation = item.customEducation;
                    if (item.customUniversity) edu.customUniversity = item.customUniversity;
                    if (item.customCourse) edu.customCourse = item.customCourse;
                    if (item.customSpecialization) edu.customSpecialization = item.customSpecialization;
                    const collegeVal = item.schoolCollegeName || item.college;
                    if (collegeVal && String(collegeVal).trim()) {
                        edu.schoolCollegeName = String(collegeVal).trim();
                        edu.college = String(collegeVal).trim();
                        if (edu.university) {
                            edu.customUniversity = String(collegeVal).trim();
                        }
                    }
                    if (item.courseType) {
                        const ctLower = String(item.courseType).toLowerCase().replace(/[-_]/g, ' ').trim();
                        if (ctLower.includes('part')) edu.courseType = 'Part Time';
                        else if (ctLower.includes('distance')) edu.courseType = 'Distance Learning';
                        else if (ctLower.includes('correspondence')) edu.courseType = 'Correspondence';
                        else edu.courseType = 'Full Time';
                    }
                    // startYear — form uses startYear directly
                    if (item.startYear != null && item.startYear !== '') edu.startYear = Number(item.startYear);
                    // passingYear & endYear
                    const passingYear = item.endYear || item.passingYear;
                    if (passingYear != null && passingYear !== '') {
                        edu.passingYear = Number(passingYear);
                        edu.endYear = Number(passingYear);
                    }
                    if (item.gradingSystem) edu.gradingSystem = item.gradingSystem;
                    // marks & gradingValue
                    const marks = item.gradingValue || item.marks;
                    if (marks != null && marks !== '') {
                        edu.marks = Number(marks);
                        edu.gradingValue = Number(marks);
                    }
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
            if (data.cvUrl !== undefined || data.resume !== undefined) {
                const rawResume = data.resume !== undefined ? data.resume : data.cvUrl;
                // Backend requires string for resume: if deleted (null, undefined, or empty), send ""
                const resumeString = (rawResume && typeof rawResume === 'string') ? rawResume.trim() : '';
                payload.resume = resumeString;
                console.log('[mockApi] updateStudentProfile setting payload.resume:', resumeString || '"" (cleared resume)');
                if (!resumeString) {
                    if (typeof window !== 'undefined') {
                        localStorage.setItem(`squrx_deleted_cv_${userId}`, 'true');
                    }
                    MockDB.updateStudentProfile(userId, { cvUrl: null, resume: null, cvName: null, resumeName: null });
                } else {
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem(`squrx_deleted_cv_${userId}`);
                    }
                }
            }

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
            if (data.hometownCountry || data.hometownCountryId) {
                const countryObj: any = data.hometownCountry;
                const rawCountry = isValidObjectId(data.hometownCountryId)
                    ? data.hometownCountryId
                    : (typeof countryObj === 'object' && countryObj ? countryObj._id : countryObj);
                if (typeof rawCountry === 'string' && isValidObjectId(rawCountry.trim())) {
                    payload.hometownCountry = rawCountry.trim();
                }
            }

            if (data.schoolCollegeName) payload.schoolCollegeName = data.schoolCollegeName;
            if (data.highestEducation) payload.highestEducation = data.highestEducation;
            if (data.ugUniversity) payload.ugUniversity = data.ugUniversity;
            if (data.pgUniversity) payload.pgUniversity = data.pgUniversity;
            if (data.graduationUniversity) payload.graduationUniversity = data.graduationUniversity;

            // languagesKnown[] — array of { language, proficiency, read, write, speak }
            // Only filter out entries that have no valid language selected at all.
            // Proficiency is optional — if provided, it must be a valid ObjectID.
            if (data.languagesKnown !== undefined) {
                payload.languagesKnown = Array.isArray(data.languagesKnown) ? data.languagesKnown
                    .filter((l: any) => isValidObjectId(l.language))
                    .map((l: any) => {
                        const entry: Record<string, any> = {
                            language: l.language,
                            read: !!l.read,
                            write: !!l.write,
                            speak: !!l.speak
                        };
                        if (isValidObjectId(l.proficiency)) {
                            entry.proficiency = l.proficiency;
                        }
                        return entry;
                    }) : [];
            }

            // employmentHistory[] — exact backend structure
            if (data.employmentHistory !== undefined) {
                payload.employmentHistory = Array.isArray(data.employmentHistory) ? data.employmentHistory.map((e: any) => {
                    const emp: Record<string, any> = {
                        isCurrentEmployment: !!e.isCurrentEmployment,
                        companyName: e.companyName || '',
                        jobTitle: e.jobTitle || '',
                        joiningDate: formatJoiningDatePayload(e.joiningDate),
                        currentSalary: formatSalaryPayload(e.currentSalary),
                        skillsUsed: Array.isArray(e.skillsUsed)
                            ? e.skillsUsed
                                .map((s: any) => typeof s === 'object' && s ? (s._id || s.name) : String(s).trim())
                                .filter(isValidObjectId)
                            : [],
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

            if (data.certifications !== undefined) {
                payload.certifications = Array.isArray(data.certifications)
                    ? data.certifications
                        .filter((c: any) => c && typeof c.name === 'string' && c.name.trim().length > 0)
                        .map((c: any) => {
                            const certObj: Record<string, any> = {
                                name: c.name.trim(),
                                status: isCertificationCompleted(c) ? 'Completed' : 'Undergoing',
                                doesNotExpire: !!c.doesNotExpire
                            };
                            if (c.completionId && c.completionId.trim()) certObj.completionId = c.completionId.trim();
                            if (c.url && c.url.trim()) certObj.url = c.url.trim();
                            if (c.validFromMonth != null && c.validFromMonth !== '') certObj.validFromMonth = Number(c.validFromMonth);
                            if (c.validFromYear != null && c.validFromYear !== '') certObj.validFromYear = Number(c.validFromYear);
                            if (!c.doesNotExpire) {
                                if (c.validToMonth != null && c.validToMonth !== '') certObj.validToMonth = Number(c.validToMonth);
                                if (c.validToYear != null && c.validToYear !== '') certObj.validToYear = Number(c.validToYear);
                            }
                            return certObj;
                        })
                    : [];
            }

            if (data.awards !== undefined) {
                const awardsVal = data.awards as any;
                payload.awards = typeof awardsVal === 'string' 
                    ? awardsVal 
                    : (Array.isArray(awardsVal) ? awardsVal.map((a: any) => typeof a === 'string' ? a : (a?.title || a?.name || '')).join('\n') : '');
            }

            // projects[] — exact backend structure: title, tag, client, status ('Ongoing'|'Completed'), details, location, projectSite, teamSize, role, etc.
            if (data.projects !== undefined) {
                const projectsVal = data.projects as any;
                if (typeof projectsVal === 'string') {
                    const trimmed = projectsVal.trim();
                    payload.projects = trimmed ? [{ title: trimmed, status: 'Completed', details: '' }] : [];
                } else if (Array.isArray(projectsVal)) {
                    payload.projects = projectsVal
                        .filter((p: any) => p && (p.title || (typeof p === 'string' && p.trim())))
                        .map((p: any) => {
                            if (typeof p === 'string') return { title: p.trim(), status: 'Completed', details: '' };
                            const proj: Record<string, any> = {
                                title: p.title || '',
                                status: p.status === 'Completed' ? 'Completed' : 'Ongoing',
                                details: p.details || ''
                            };
                            if (p.tag) proj.tag = p.tag;
                            if (p.client) proj.client = p.client;
                            if (p.workedFromYear != null && p.workedFromYear !== '') proj.workedFromYear = Number(p.workedFromYear);
                            if (p.workedFromMonth != null && p.workedFromMonth !== '') proj.workedFromMonth = Number(p.workedFromMonth);
                            // For completed projects, record workedTill dates; for ongoing, do not pass stale end dates
                            if (p.status === 'Completed') {
                                if (p.workedTillYear != null && p.workedTillYear !== '') proj.workedTillYear = Number(p.workedTillYear);
                                if (p.workedTillMonth != null && p.workedTillMonth !== '') proj.workedTillMonth = Number(p.workedTillMonth);
                            }
                            if (p.location) proj.location = p.location;
                            if (p.projectSite) proj.projectSite = p.projectSite;
                            if (isValidObjectId(p.natureOfEmployment)) proj.natureOfEmployment = p.natureOfEmployment;
                            if (p.teamSize) proj.teamSize = p.teamSize;
                            if (isValidObjectId(p.role)) proj.role = p.role;
                            if (p.roleDescription) proj.roleDescription = p.roleDescription;
                            if (p.skillsUsed !== undefined && p.skillsUsed !== null) {
                                const skillsStr = typeof p.skillsUsed === 'string'
                                    ? p.skillsUsed.trim()
                                    : (Array.isArray(p.skillsUsed)
                                        ? p.skillsUsed.map((s: any) => typeof s === 'object' && s ? (s.name || s._id) : String(s).trim()).filter(Boolean).join(', ')
                                        : String(p.skillsUsed).trim());
                                if (skillsStr) {
                                    proj.skillsUsed = skillsStr;
                                }
                            }
                            return proj;
                        });
                } else {
                    payload.projects = [];
                }
            }

            if (data.internships !== undefined || data.internship !== undefined) {
                const rawList = Array.isArray(data.internships) ? data.internships : (Array.isArray(data.internship) ? data.internship : []);
                const formattedInternships = rawList
                    .filter((i: any) => i && (i.companyName?.trim() || i.company?.trim() || i.role?.trim() || i.title?.trim() || i.duration?.trim()))
                    .map(normalizeInternshipItem);
                payload.internships = formattedInternships;
                payload.internship = formattedInternships;
            }

            if (data.profileSummary !== undefined) {
                payload.profileSummary = typeof data.profileSummary === 'string' ? data.profileSummary : '';
            }

            if (data.otherAchievements !== undefined) {
                if (Array.isArray(data.otherAchievements)) {
                    payload.otherAchievements = data.otherAchievements
                        .map((item: any) => {
                            if (typeof item === 'object' && item !== null) {
                                const nameVal = (item.name || item.title || '').trim();
                                if (!nameVal) return null;
                                const achObj: Record<string, any> = { name: nameVal, title: nameVal };
                                if (item.link && item.link.trim()) achObj.link = item.link.trim();
                                if (item.description && item.description.trim()) achObj.description = item.description.trim();
                                return achObj;
                            }
                            if (typeof item === 'string' && item.trim()) {
                                return { name: item.trim(), title: item.trim() };
                            }
                            return null;
                        })
                        .filter(Boolean);
                } else if (typeof data.otherAchievements === 'string') {
                    payload.otherAchievements = data.otherAchievements
                        .split('\n')
                        .map((s: string) => s.trim())
                        .filter(Boolean)
                        .map((val: string) => ({ name: val, title: val }));
                } else {
                    payload.otherAchievements = [];
                }
            }

            console.log('[SQURX DEBUG] PUT /user/me payload:', JSON.stringify(payload, null, 2));

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
