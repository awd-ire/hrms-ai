import { useAuth } from "@/hooks/useAuth";
import { getRoleRank, hasAnyRole, hasRoleAtLeast } from "@/utils/roleHierarchy";

/**
 * Role-based access control hook (RBAC)
 * Roles from backend:
 * - candidate
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
  const isCandidate = role === "candidate";
  const isEmployee = role === "employee";

  /**
   * Permission checker
   */
  const can = (allowedRoles = []) => {
    return hasAnyRole(role, allowedRoles);
  };

  const canAtLeast = (minimumRole) => hasRoleAtLeast(role, minimumRole);

  return {
    role,
    roleRank: getRoleRank(role),
    isAdmin,
    isManager,
    isHR,
    isCandidate,
    isEmployee,
    can,
    canAtLeast,
  };
};
