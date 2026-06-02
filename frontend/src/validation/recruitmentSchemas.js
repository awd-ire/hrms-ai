import { z } from "zod";

/**
 * Matches backend:
 * JobPosting, Candidate, Interview schemas
 */

export const jobPostingSchema = z.object({
  id: z.number().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  department_id: z.number(),
  location: z.string().optional(),
  status: z.enum(["open", "closed", "draft"]).optional()
});

export const candidateSchema = z.object({
  id: z.number().optional(),
  job_posting_id: z.number(),
  full_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  resume_path: z.string().optional(),
  experience_years: z.number().nonnegative(),
  current_company: z.string().optional(),
  current_role: z.string().optional(),
  ai_score: z.number().optional(),
  ai_summary: z.string().nullable().optional(),
  stage: z.string().optional(),
  applied_date: z.string().optional(),
  created_at: z.string().optional()
});

export const interviewSchema = z.object({
  id: z.number().optional(),
  candidate_id: z.number(),
  interviewer_id: z.number().optional(),
  scheduled_at: z.string().optional(),
  feedback: z.string().optional(),
  score: z.number().optional(),
  status: z.enum(["scheduled", "completed", "cancelled"]).optional()
});
