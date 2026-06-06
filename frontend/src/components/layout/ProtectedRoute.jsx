import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRoleRank, hasAnyRole } from "@/utils/roleHierarchy";

/**
 * ProtectedRoute enforces authentication guard
 * - Shows loading state
 * - Redirects to /login if unauthenticated
 */
const ProtectedRoute = ({ allowedRoles, children }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const currentRole = user?.role;

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        Loading authentication...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const mixedEmployeeRule =
      allowedRoles.includes("employee") &&
      allowedRoles.some((role) => role !== "employee");

    const hasAccess = mixedEmployeeRule
      ? hasAnyRole(currentRole, allowedRoles)
      : currentRole
        ? getRoleRank(currentRole) >= Math.min(...allowedRoles.map(getRoleRank))
        : false;

    if (!hasAccess) {
      return (
        <div className="h-screen flex items-center justify-center text-red-600 font-semibold">
          Access Denied
        </div>
      );
    }
  }

  // If children are provided (used by RoleRoute), render them directly.
  if (children) return <>{children}</>;

  // Otherwise render nested routes via Outlet
  return <Outlet />;
};

export default ProtectedRoute;
