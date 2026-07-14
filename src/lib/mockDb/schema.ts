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
  documentUrl?: string | null;
  alertCount: number;
  // Extended onboarding fields
  education?: string;
  educationId?: string;
  experienceLevel?: string;
  experienceLevelId?: string;
  expectedSalary?: string;
  currentSalary?: string;
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
  highestEducation?: string;
  pgUniversity?: string;
  graduationUniversity?: string;
  ugUniversity?: string;
  schoolCollegeName?: string;
  languages?: string;
  certifications?: Array<{ name: string; status: 'completed' | 'undergoing' }>;
  awards?: string;
  projects?: string;
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
