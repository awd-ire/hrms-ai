import { useAuth } from "@/hooks/useAuth";

/**
 * Role-based access control hook (RBAC)
 * Roles from backend:
 * - admin
 * - senior_manager
 * - hr_recruiter
 * - employee
 */
export const usePermissions = () => {
  const { user } = useAuth();

  const role = user?.role;

  const isAdmin = role === "admin";
  const isManager = role === "senior_manager";
  const isHR = role === "hr_recruiter";
  const isEmployee = role === "employee";

  /**
   * Permission checker
   */
  const can = (allowedRoles = []) => {
    if (!role) return false;
    return allowedRoles.includes(role);
  };

  return {
    role,
    isAdmin,
    isManager,
    isHR,
    isEmployee,
    can
  };
};