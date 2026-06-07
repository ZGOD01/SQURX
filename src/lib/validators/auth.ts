import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  mobile: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'RECRUITER']),
  resume: z.any().optional(),
  document: z.any().optional(),
}).refine((data) => {
  if (data.role === 'STUDENT') {
    const digitsOnly = data.mobile ? data.mobile.replace(/\D/g, '') : '';
    return digitsOnly.length === 10;
  }
  return true;
}, {
  message: 'Mobile number must be exactly 10 digits',
  path: ['mobile'],
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
