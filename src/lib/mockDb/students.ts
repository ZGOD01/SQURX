export interface MockStudent {
  id: string;
  name: string;
  avatar: string;
  location: string;
  jobType: string;
  careerGoal: string;
  skills: string[];
  cvUrl?: string;
  university: string;
  degree: string;
}

export const getMockStudents = (): MockStudent[] => [
  {
    id: 'stu-001',
    name: 'Alexandra Chen',
    avatar: 'AC',
    location: 'San Francisco, CA',
    jobType: 'Full-Time',
    careerGoal: 'To build scalable backend systems that power global products.',
    skills: ['Python', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
    cvUrl: '#download-ac-cv',
    university: 'Stanford University',
    degree: 'B.S. Computer Science'
  },
  {
    id: 'stu-002',
    name: 'Marcus Johnson',
    avatar: 'MJ',
    location: 'Remote',
    jobType: 'Contract',
    careerGoal: 'Leading frontend architecture and building accessible user interfaces.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Figma', 'GraphQL'],
    cvUrl: '#download-mj-cv',
    university: 'University of Texas',
    degree: 'B.S. Software Engineering'
  },
  {
    id: 'stu-003',
    name: 'Elena Rodriguez',
    avatar: 'ER',
    location: 'New York, NY',
    jobType: 'Full-Time',
    careerGoal: 'Transitioning from data analysis into core machine learning engineering.',
    skills: ['Python', 'TensorFlow', 'SQL', 'Data Visualization', 'Pandas'],
    cvUrl: '#download-er-cv',
    university: 'NYU',
    degree: 'M.S. Data Science'
  },
  {
    id: 'stu-004',
    name: 'James Wilson',
    avatar: 'JW',
    location: 'London, UK',
    jobType: 'Hybrid',
    careerGoal: 'Product management with a strong technical foundation.',
    skills: ['Agile', 'Product Strategy', 'Jira', 'User Research', 'Python'],
    university: 'London School of Economics',
    degree: 'B.S. Business Management'
  },
  {
    id: 'stu-005',
    name: 'Sarah Kim',
    avatar: 'SK',
    location: 'San Francisco, CA',
    jobType: 'Internship',
    careerGoal: 'Seeking a summer internship to apply my full-stack web development skills.',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'HTML/CSS'],
    cvUrl: '#download-sk-cv',
    university: 'UC Berkeley',
    degree: 'B.S. Computer Science (Expected 2027)'
  },
  {
    id: 'stu-006',
    name: 'David Patel',
    avatar: 'DP',
    location: 'Austin, TX',
    jobType: 'Full-Time',
    careerGoal: 'DevOps engineer focused on automation and CI/CD pipelines.',
    skills: ['Docker', 'Kubernetes', 'AWS', 'Terraform', 'Linux'],
    cvUrl: '#download-dp-cv',
    university: 'Georgia Tech',
    degree: 'B.S. Computer Engineering'
  }
];
