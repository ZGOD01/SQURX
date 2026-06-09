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
  countryCode: z.string().optional(),
  country: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['STUDENT', 'RECRUITER']),
  resume: z.any().optional(),
  document: z.any().optional(),
}).superRefine((data, ctx) => {
  if (data.role === 'STUDENT') {
    const digitsOnly = data.mobile ? data.mobile.replace(/\D/g, '') : '';
    if (digitsOnly.length !== 10) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Mobile number must be exactly 10 digits',
        path: ['mobile'],
      });
    }
    if (!data.countryCode || data.countryCode.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Country code is required',
        path: ['countryCode'],
      });
    }
    if (!data.country || data.country.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Country is required',
        path: ['country'],
      });
    }
  }
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
