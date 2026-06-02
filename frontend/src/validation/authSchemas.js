import { z } from "zod";

/**
 * Matches backend:
 * UserLogin, UserRegister, TokenResponse, UserResponse
 */

export const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters")
});

export const registerSchema = z.object({
  username: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "senior_manager", "hr_recruiter", "employee"])
});

export const tokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.string().optional()
});

export const userResponseSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  role: z.enum(["admin", "senior_manager", "hr_recruiter", "employee"]),
  is_active: z.boolean().optional()
});