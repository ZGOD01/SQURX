import { z } from 'zod';

export const studentProfileSchema = z.object({
  location: z.string().min(2, 'Location is required'),
  jobType: z.string().min(2, 'Job type is required'),
  careerGoal: z.string().min(10, 'Career goal must be at least 10 characters'),
});

export type StudentProfileValues = z.infer<typeof studentProfileSchema>;

export const studentPreferencesSchema = z.object({
  locations: z.array(z.string()).min(1, 'Select at least one location'),
  jobTypes: z.array(z.string()).min(1, 'Select at least one job type'),
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
  alertCount: z.number().min(5).max(20),
});

export type StudentPreferencesValues = z.infer<typeof studentPreferencesSchema>;
