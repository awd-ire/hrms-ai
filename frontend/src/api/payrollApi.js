import api from "@/api/axios";

/**
 * Payroll API
 */

export const payrollApi = {
  myPayroll: () => api.get("/payroll/my"),

  getEmployeePayroll: (id) => api.get(`/payroll/employee/${id}`),

  generate: () => api.post("/payroll/generate"),

  process: (id) => api.put(`/payroll/${id}/process`),

  analytics: () => api.get("/payroll/analytics"),

  payslip: (id) => api.get(`/payroll/${id}/payslip`)
};