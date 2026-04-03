export interface MockUser {
  id: string;
  name: string;
  email: string;
  role: 'STUDENT' | 'RECRUITER' | 'ADMIN';
  status: 'Active' | 'Suspended';
  lastLogin: string;
}

export const getMockUsers = (): MockUser[] => [
  { id: 'usr-101', name: 'Admin User', email: 'admin@squrx.com', role: 'ADMIN', status: 'Active', lastLogin: '2 hours ago' },
  { id: 'usr-201', name: 'John Doe', email: 'john@student.edu', role: 'STUDENT', status: 'Active', lastLogin: 'Yesterday' },
  { id: 'usr-202', name: 'Alexandra Chen', email: 'alex@student.edu', role: 'STUDENT', status: 'Active', lastLogin: '3 days ago' },
  { id: 'usr-203', name: 'Marcus Johnson', email: 'marcus@student.edu', role: 'STUDENT', status: 'Suspended', lastLogin: '1 week ago' },
  { id: 'usr-301', name: 'Acme Corp HR', email: 'hr@acme.com', role: 'RECRUITER', status: 'Active', lastLogin: '5 hours ago' },
  { id: 'usr-302', name: 'TechCorp Talent', email: 'talent@techcorp.com', role: 'RECRUITER', status: 'Active', lastLogin: 'Today' },
];
