export type Role = 'STUDENT' | 'RECRUITER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'Active' | 'Suspended';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface EducationHistoryItem {
  _id?: string;
  education?: string; // Degree ID
  university?: string; // University ID
  course?: string; // Course ID
  specialization?: string; // Specialization ID
  customEducation?: string;
  customUniversity?: string;
  customCourse?: string;
  customSpecialization?: string;
  courseType?: string; // e.g. Full-time, Part-time
  startYear?: string | number;
  endYear?: string | number;
  gradingSystem?: string;
  gradingValue?: string | number;
}

/**
 * One entry in employmentHistory[].
 * NOTE: currentSalary is intentionally a string in this document (matches backend spec).
 */
export interface EmploymentHistoryItem {
  _id?: string;
  companyName?: string;
  role?: string;
  startDate?: string;    // e.g. "2021-06"
  endDate?: string;      // e.g. "2023-08" — empty/absent when isCurrent is true
  isCurrent?: boolean;
  currentSalary?: string; // kept as string per spec ("still a string in this document")
  description?: string;
}

/**
 * One entry in projects[].
 * status: 'ongoing' | 'completed' | 'paused'
 */
export interface ProjectItem {
  _id?: string;
  title?: string;
  description?: string;
  status?: 'ongoing' | 'completed' | 'paused';
  siteLink?: string;   // live URL / GitHub link
  teamSize?: number | string;
}

/**
 * One entry in languagesKnown[].
 * Replaces the old plain `languages: string` field.
 */
export interface LanguageKnownItem {
  language?: string;    // language ID (from /languages) or display name
  languageName?: string; // resolved display name
  proficiency?: string; // proficiency ID (from /language-proficiencies) or display name
  proficiencyName?: string; // resolved display name
}

export interface CurrencyObject {
  _id: string;
  name?: string;
  code: string;
  symbol: string;
  isActive?: boolean;
}

export interface SalaryValue {
  amount: number | null;
  currency: CurrencyObject | string | null;
}

export interface StudentProfile {
  userId: string;
  fullName?: string;
  location: string;
  jobType: string;
  careerGoal: string;
  skills: string[];
  locations: string[];
  jobTypes: string[];
  cvUrl: string | null;
  cvName?: string | null;
  resumeName?: string | null;
  documentUrl?: string | null;
  alertCount: number;
  experienceLevel?: string;
  experienceLevelId?: string;
  expectedSalary?: SalaryValue | string | null;
  currentSalary?: SalaryValue | string | null;
  // Backend-synced completion percentage (source of truth from /me)
  profileCompletionPercentage?: number;
  // Backend-synced GDPR consent state
  gdprConsent?: boolean;
  // Resume URL synced from backend
  resume?: string | null;
  preferredDomainIds?: string[];
  preferredLocationIds?: string[];
  preferredJobTypeIds?: string[];
  gender?: string;
  dob?: string;
  currentLocation?: string;
  hometown?: string;
  // ── Array fields — PUT replaces the whole stored array ──
  /** Array of known languages with proficiency. Replaces old `languages: string`. */
  languagesKnown?: LanguageKnownItem[];
  educationHistory?: EducationHistoryItem[];
  /** Full employment history. PUT replaces whole array. currentSalary per item is a string. */
  employmentHistory?: EmploymentHistoryItem[];
  certifications?: Array<{ name: string; status: 'completed' | 'undergoing' }>;
  awards?: string;
  /** Structured project list. PUT replaces whole array. */
  projects?: ProjectItem[];
  internships?: Array<{ companyName: string; duration: string; role: string }>;
  profileSummary?: string;
  otherAchievements?: string;
}

export interface CompanyProfile {
  userId: string;
  name: string;
  website: string;
  industry: string;
  description: string;
}

export interface JobVacancy {
  id: string;
  recruiterId: string;
  companyName: string;
  title: string;
  degree: string;
  location: string;
  skills: string[];
  jobType: string;
  experienceLevel: string;
  salary: string;
  description: string;
  applyLink: string;
  status: 'Active' | 'Closed';
  createdAt: string;
  views: number;
  clicks: number;
}

export interface ApplicationDecision {
  status: 'SHORTLIST' | 'REJECT' | 'HOLD' | null;
  notes: string;
}

export interface JobApplication {
  id: string;
  studentId: string;
  vacancyId: string;
  appliedAt: string;
  decision: ApplicationDecision | null;
}

export interface ConsultationBooking {
  id: string;
  studentId: string;
  date: string;
  timeSlot: string;
  bookedAt: string;
}

export interface SystemActivity {
  id: string;
  userId: string;
  type: string; // 'LOGIN', 'APPLY', 'BOOK', 'POST_JOB'
  description: string;
  timestamp: string;
}

export interface DatabaseSchema {
  users: User[];
  studentProfiles: StudentProfile[];
  companyProfiles: CompanyProfile[];
  vacancies: JobVacancy[];
  applications: JobApplication[];
  consultations: ConsultationBooking[];
  activities: SystemActivity[];
}
