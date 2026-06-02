import { z } from "zod";

/**
 * Matches backend:
 * EmployeeCreate, EmployeeUpdate, EmployeeResponse, EmployeeSummaryResponse
 */

export const employeeCreateSchema = z.object({
  user_id: z.number(),
  employee_code: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  designation: z.string().min(1),
  hire_date: z.string(),
  salary: z.number().nonnegative(),
  department_id: z.number(),
  manager_id: z.number().nullable().optional(),
  status: z.string().optional(),
  is_active: z.boolean().optional()
});

export const employeeUpdateSchema = employeeCreateSchema.partial();

export const employeeResponseSchema = z.object({
  id: z.number(),
  user_id: z.number().nullable(),
  employee_code: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  designation: z.string(),
  hire_date: z.string(),
  salary: z.number(),
  department_id: z.number(),
  manager_id: z.number().nullable(),
  status: z.string(),
  is_active: z.boolean(),
  profile_image: z.string().nullable().optional()
});

export const employeeSummarySchema = z.object({
  employee: employeeResponseSchema,
  attendance_records: z.number(),
  pending_leaves: z.number(),
  approved_leaves: z.number(),
  latest_payroll: z
    .object({
      id: z.number(),
      payroll_month: z.string(),
      payroll_year: z.number(),
      net_salary: z.number(),
      status: z.string()
    })
    .nullable()
    .optional(),
  average_rating: z.number().optional()
});
