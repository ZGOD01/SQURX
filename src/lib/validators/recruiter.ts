import { z } from 'zod';

export const companyProfileSchema = z.object({
  name: z.string().min(2, 'Company name is required'),
  website: z.string().url('Must be a valid URL').or(z.literal('')),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  industry: z.string().min(2, 'Industry is required'),
});

export type CompanyProfileValues = z.infer<typeof companyProfileSchema>;

export const vacancySchema = z.object({
  title: z.string().min(2, 'Role title is required'),
  degree: z.string().min(2, 'Degree requirement is required'),
  location: z.string().min(2, 'Location is required'),
  skills: z.array(z.string()).min(1, 'Add at least one skill tag'),
  jobType: z.string().min(2, 'Job type is required'),
  experienceLevel: z.string().min(2, 'Experience level is required'),
  salary: z.string().min(2, 'Salary info is required'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  applyLink: z.string().url('Must be a valid URL'),
});

export type VacancyValues = z.infer<typeof vacancySchema>;
