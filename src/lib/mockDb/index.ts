import type { DatabaseSchema, User, JobVacancy, JobApplication, StudentProfile, CompanyProfile, ConsultationBooking, SystemActivity } from './schema';
import { generateSeedData } from './seed';

const DB_KEY = 'squrx_master_db_v4';

const getDb = (): DatabaseSchema => {
  const store = localStorage.getItem(DB_KEY);
  if (!store) {
    const seed = generateSeedData();
    localStorage.setItem(DB_KEY, JSON.stringify(seed));
    return seed;
  }
  return JSON.parse(store) as DatabaseSchema;
};

const saveDb = (db: DatabaseSchema) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const MockDB = {
  getUsers: () => getDb().users,
  getUserById: (id: string) => getDb().users.find(u => u.id === id),
  updateUser: (id: string, updates: Partial<User>) => {
    const db = getDb();
    const index = db.users.findIndex(u => u.id === id);
    if (index > -1) {
      db.users[index] = { ...db.users[index], ...updates };
      saveDb(db);
    }
  },
  addUser: (user: User) => {
    const db = getDb();
    // Verify it doesn't already exist to prevent dupes
    if (!db.users.find(u => u.email === user.email)) {
        db.users.push(user);
        saveDb(db);
    } else {
        throw new Error("Email already registered");
    }
  },

  getStudentProfiles: () => getDb().studentProfiles,
  getStudentProfile: (userId: string) => getDb().studentProfiles.find(p => p.userId === userId) || null,
  updateStudentProfile: (userId: string, profile: Partial<StudentProfile>) => {
    const db = getDb();
    const index = db.studentProfiles.findIndex(p => p.userId === userId);
    if (index > -1) {
      db.studentProfiles[index] = { ...db.studentProfiles[index], ...profile };
    } else {
      db.studentProfiles.push({ userId, location: '', jobType: 'Full-Time', careerGoal: '', skills: [], locations: [], jobTypes: [], cvUrl: null, alertCount: 10, ...profile });
    }
    saveDb(db);
  },

  getCompanyProfile: (userId: string) => getDb().companyProfiles.find(c => c.userId === userId) || null,
  updateCompanyProfile: (userId: string, profile: Partial<CompanyProfile>) => {
    const db = getDb();
    const index = db.companyProfiles.findIndex(c => c.userId === userId);
    if (index > -1) {
        db.companyProfiles[index] = { ...db.companyProfiles[index], ...profile };
    } else {
        db.companyProfiles.push({ userId, name: '', website: '', industry: '', description: '', ...profile });
    }
    saveDb(db);
  },

  deleteStudentAccount: (userId: string) => {
    const db = getDb();
    // Remove the main user
    db.users = db.users.filter(u => u.id !== userId);
    // Remove the student profile
    db.studentProfiles = db.studentProfiles.filter(p => p.userId !== userId);
    // Remove all their job applications
    db.applications = db.applications.filter(a => a.studentId !== userId);
    // Remove all their consultations
    db.consultations = db.consultations.filter(c => c.studentId !== userId);
    // Remove all their specific activities
    db.activities = db.activities.filter(a => a.userId !== userId);
    saveDb(db);
  },

  getVacancies: () => getDb().vacancies,
  getVacanciesByRecruiter: (recruiterId: string) => getDb().vacancies.filter(v => v.recruiterId === recruiterId),
  createVacancy: (vacancy: JobVacancy) => {
    const db = getDb();
    db.vacancies.unshift(vacancy);
    saveDb(db);
  },
  updateVacancy: (id: string, updates: Partial<JobVacancy>) => {
    const db = getDb();
    const index = db.vacancies.findIndex(v => v.id === id);
    if (index > -1) {
      db.vacancies[index] = { ...db.vacancies[index], ...updates };
      saveDb(db);
    }
  },
  deleteVacancy: (id: string) => {
    const db = getDb();
    db.vacancies = db.vacancies.filter(v => v.id !== id);
    saveDb(db);
  },

  getApplications: () => getDb().applications,
  getApplicationsByStudent: (studentId: string) => getDb().applications.filter(a => a.studentId === studentId),
  getApplicationsForVacancy: (vacancyId: string) => getDb().applications.filter(a => a.vacancyId === vacancyId),
  createApplication: (app: JobApplication) => {
    const db = getDb();
    if (!db.applications.find(a => a.studentId === app.studentId && a.vacancyId === app.vacancyId)) {
        db.applications.push(app);
        saveDb(db);
    }
  },
  updateApplicationDecision: (id: string, decision: { status: 'SHORTLIST'|'REJECT'|'HOLD', notes: string }) => {
    const db = getDb();
    const index = db.applications.findIndex(a => a.id === id);
    if (index > -1) {
        db.applications[index].decision = decision;
        saveDb(db);
    }
  },

  getConsultation: (studentId: string) => getDb().consultations.find(c => c.studentId === studentId) || null,
  bookConsultation: (booking: ConsultationBooking) => {
    const db = getDb();
    // remove existing if any
    db.consultations = db.consultations.filter(c => c.studentId !== booking.studentId);
    db.consultations.push(booking);
    saveDb(db);
  },
  cancelConsultation: (studentId: string) => {
    const db = getDb();
    db.consultations = db.consultations.filter(c => c.studentId !== studentId);
    saveDb(db);
  },

  getActivities: (userId: string) => getDb().activities.filter(a => a.userId === userId).sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
  getAllSystemActivities: () => getDb().activities.slice(0, 50),
  addActivity: (activity: SystemActivity) => {
    const db = getDb();
    db.activities.unshift(activity);
    saveDb(db);
  }
};
