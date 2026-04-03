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
  location: string;
  jobType: string;
  careerGoal: string;
  skills: string[];
  locations: string[];
  jobTypes: string[];
  cvUrl: string | null;
  documentUrl?: string | null;
  alertCount: number;
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
