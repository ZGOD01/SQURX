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
 * Strictly matches backend schema: employmentType is required (reuses JobType lookup).
 */
export interface EmploymentHistoryItem {
  _id?: string;
  employmentType?: string; // ObjectId (reuses JobType lookup)
  isCurrentEmployment?: boolean;
  totalExperienceYears?: number;
  totalExperienceMonths?: number;
  companyName?: string;
  jobTitle?: string;
  joiningDate?: string;
  currentSalary?: string; // kept as string per backend spec
  skillsUsed?: string[];
  jobProfile?: string;
  noticePeriod?: string;
}

/**
 * One entry in projects[].
 * Strictly matches backend schema: status ('Ongoing' | 'Completed'), details, projectSite, teamSize, role, etc.
 */
export interface ProjectItem {
  _id?: string;
  title: string;
  tag?: string;
  client?: string;
  status?: 'Ongoing' | 'Completed';
  workedFromYear?: number;
  workedFromMonth?: number;
  workedTillYear?: number;
  workedTillMonth?: number;
  details?: string;
  location?: string;
  projectSite?: 'Onsite' | 'Remote' | 'Hybrid';
  natureOfEmployment?: string; // ObjectId
  teamSize?: '1-5' | '6-10' | '11-20' | '21-50' | '50+';
  role?: string; // ObjectId
  roleDescription?: string;
  skillsUsed?: string;
}

/**
 * One entry in languagesKnown[].
 * Strictly matches backend schema: language and proficiency are required ObjectIds, plus read/write/speak booleans.
 */
export interface LanguageKnownItem {
  _id?: string;
  language: string;    // language ID (from /languages)
  proficiency: string; // proficiency ID (from /language-proficiencies)
  read?: boolean;
  write?: boolean;
  speak?: boolean;
  languageName?: string;   // UI display helper
  proficiencyName?: string; // UI display helper
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
  hometownCountry?: string;
  // ── Array fields — PUT replaces the whole stored array ──
  /** Array of known languages with proficiency and read/write/speak. */
  languagesKnown?: LanguageKnownItem[];
  educationHistory?: EducationHistoryItem[];
  /** Full employment history per backend spec. */
  employmentHistory?: EmploymentHistoryItem[];
  certifications?: Array<{ name: string; status: 'completed' | 'undergoing' }>;
  awards?: string;
  /** Structured project list per backend spec. */
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
