import { z } from "zod";

/**
 * Matches backend:
 * LeaveRequest, LeaveResponse, LeaveBalance, LeaveAnalytics
 */

export const leaveRequestSchema = z.object({
  employee_id: z.number().optional(),
  leave_type: z.enum(["sick", "casual", "earned", "unpaid"]),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string().min(3),
  status: z.string().optional()
});

export const leaveResponseSchema = z.object({
  id: z.number(),
  employee_id: z.number(),
  leave_type: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  reason: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  approved_by: z.number().nullable().optional(),
  created_at: z.string()
});

export const leaveBalanceSchema = z.object({
  employee_id: z.number(),
  total: z.number(),
  used: z.number(),
  remaining: z.number()
});

export const leaveAnalyticsSchema = z.object({
  total_requests: z.number(),
  approved: z.number(),
  rejected: z.number(),
  pending: z.number()
});