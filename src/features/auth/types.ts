export type Role = 'STUDENT' | 'RECRUITER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}
