import type { DatabaseSchema, User, StudentProfile, CompanyProfile, JobVacancy, JobApplication, ConsultationBooking, SystemActivity } from './schema';
import { addDays, subDays, subHours } from 'date-fns';

const generateId = (prefix: string, i: number) => `${prefix}-${String(i).padStart(3, '0')}`;
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomItem = <T>(arr: T[]): T => arr[getRandomInt(0, arr.length - 1)];
const randomDate = (daysAgo: number) => subHours(new Date(), getRandomInt(1, daysAgo * 24)).toISOString();

const USERS: User[] = [];
const STUDENTS: StudentProfile[] = [];
const COMPANIES: CompanyProfile[] = [];
const VACANCIES: JobVacancy[] = [];
const APPLICATIONS: JobApplication[] = [];
const CONSULTATIONS: ConsultationBooking[] = [];
const ACTIVITIES: SystemActivity[] = [];

export const generateSeedData = (): DatabaseSchema => {
  // 1. Admin
  USERS.push({
    id: 'usr-admin',
    name: 'System Admin',
    email: 'admin@gmail.com',
    role: 'ADMIN',
    status: 'Active',
    lastLoginAt: new Date().toISOString(),
    createdAt: subDays(new Date(), 365).toISOString()
  });

  // 2. 8 Recruiters
  const industryList = ['Technology', 'Finance', 'Healthcare', 'Consulting', 'E-commerce', 'Entertainment'];
  const locations = ['San Francisco, CA', 'New York, NY', 'Remote', 'London, UK', 'Austin, TX', 'Berlin, Germany'];
  const skillsList = ['React', 'Node.js', 'Python', 'AWS', 'Docker', 'Machine Learning', 'SQL', 'TypeScript', 'Figma', 'Product Strategy'];

  for (let i = 1; i <= 8; i++) {
    const id = generateId('usr-rec', i);
    USERS.push({
      id,
      name: `Recruiter ${i}`,
      email: `recruiter${i}@company.com`,
      role: 'RECRUITER',
      status: 'Active',
      lastLoginAt: randomDate(7),
      createdAt: subDays(new Date(), getRandomInt(30, 200)).toISOString()
    });
    COMPANIES.push({
      userId: id,
      name: `Company ${i} Ltd`,
      industry: getRandomItem(industryList),
      website: `https://company${i}.com`,
      description: `We are a leading firm in the ${getRandomItem(industryList)} sector, building innovative solutions.`
    });
  }

  // 3. 30 Students
  for (let i = 1; i <= 30; i++) {
    const id = generateId('usr-stu', i);
    USERS.push({
      id,
      name: `Student ${i}`,
      email: `student${i}@university.edu`,
      role: 'STUDENT',
      status: getRandomInt(1, 100) > 90 ? 'Suspended' : 'Active', // 10% suspended
      lastLoginAt: randomDate(14),
      createdAt: subDays(new Date(), getRandomInt(5, 100)).toISOString()
    });
    
    // Choose some random skills
    const numSkills = getRandomInt(2, 6);
    const stuSkills = [...skillsList].sort(() => 0.5 - Math.random()).slice(0, numSkills);

    STUDENTS.push({
      userId: id,
      location: getRandomItem(locations),
      jobType: getRandomItem(['Full-Time', 'Part-Time', 'Contract', 'Internship']),
      careerGoal: `Seeking a challenging role focusing on ${stuSkills[0] || 'tech'} and growth.`,
      skills: stuSkills,
      locations: [getRandomItem(locations)],
      jobTypes: [getRandomItem(['Full-Time', 'Contract'])],
      cvUrl: null,
      alertCount: 10
    });
  }

  // 4. 25 Jobs (Assigned randomly to the 8 recruiters)
  for (let i = 1; i <= 25; i++) {
    const recruiter = USERS.filter(u => u.role === 'RECRUITER')[getRandomInt(0, 7)];
    const numSkills = getRandomInt(3, 5);
    const jobSkills = [...skillsList].sort(() => 0.5 - Math.random()).slice(0, numSkills);

    const company = COMPANIES.find(c => c.userId === recruiter.id);

    VACANCIES.push({
      id: generateId('vac', i),
      recruiterId: recruiter.id,
      companyName: company ? company.name : 'Unknown Company',
      title: `Software Engineer ${i}`,
      degree: "Bachelor's Degree",
      location: getRandomItem(locations),
      skills: jobSkills,
      jobType: getRandomItem(['Full-Time', 'Contract', 'Internship']),
      experienceLevel: getRandomItem(['Fresher', '1-3 Years', '3-5 Years', '5+ Years']),
      salary: getRandomItem(['₹8L - 12L', '₹15L - 25L', '₹5L - 8L', 'Competitive']),
      description: `We are looking for a skilled engineer to join our fast scaling team. Must know ${jobSkills.join(', ')}.`,
      applyLink: 'https://example.com/apply',
      status: getRandomInt(1, 100) > 85 ? 'Closed' : 'Active', // 15% closed
      createdAt: randomDate(30),
      views: getRandomInt(50, 500),
      clicks: getRandomInt(5, 100)
    });
  }

  // 5. Applications (Random students applying to random jobs)
  // Let's create about 60 applications across the 30 students to 25 jobs
  for (let i = 1; i <= 60; i++) {
    const student = STUDENTS[getRandomInt(0, STUDENTS.length - 1)];
    const job = VACANCIES[getRandomInt(0, VACANCIES.length - 1)];
    
    // Avoid duplicate applications
    const exists = APPLICATIONS.find(a => a.studentId === student.userId && a.vacancyId === job.id);
    if (!exists) {
      // 30% chance the recruiter reviewed it
      const reviewed = getRandomInt(1, 100) > 70;
      APPLICATIONS.push({
        id: generateId('app', i),
        studentId: student.userId,
        vacancyId: job.id,
        appliedAt: randomDate(15),
        decision: reviewed ? {
          status: getRandomItem(['SHORTLIST', 'REJECT', 'HOLD']),
          notes: 'Reviewed candidate based on skills overlap.'
        } : null
      });

      // Also create an activity for this
      ACTIVITIES.push({
        id: generateId('act', ACTIVITIES.length + 1),
        userId: student.userId,
        type: 'APPLY',
        description: `Applied for ${job.title}`,
        timestamp: randomDate(15)
      });
    }
  }

  // 6. Consultations (Random students booking admin)
  for (let i = 1; i <= 10; i++) {
    const student = STUDENTS[getRandomInt(0, STUDENTS.length - 1)];
    CONSULTATIONS.push({
      id: generateId('cons', i),
      studentId: student.userId,
      date: addDays(new Date(), getRandomInt(1, 14)).toISOString(),
      timeSlot: getRandomItem(['10:00 AM', '12:00 PM', '03:00 PM']),
      bookedAt: randomDate(5)
    });
    
    ACTIVITIES.push({
      id: generateId('act', ACTIVITIES.length + 1),
      userId: student.userId,
      type: 'BOOK',
      description: `Booked a career consultation session.`,
      timestamp: randomDate(5)
    });
  }

  return {
    users: USERS,
    studentProfiles: STUDENTS,
    companyProfiles: COMPANIES,
    vacancies: VACANCIES,
    applications: APPLICATIONS,
    consultations: CONSULTATIONS,
    activities: [...ACTIVITIES].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  };
};
