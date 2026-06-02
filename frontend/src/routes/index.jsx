import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import { routeConfig, getDefaultRouteByRole } from "@/routes/routeConfig";
import { useAuth } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import AppShell from "@/components/layout/AppShell";

/**
 * Role-based route wrapper
 */
const RoleWrapper = ({ element, roles }) => {
  return <ProtectedRoute allowedRoles={roles}>{element}</ProtectedRoute>;
};

/**
 * Router renderer
 * - Centralized route mapping
 * - Role-based access control
 * - Lazy loading support
 */
const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center text-gray-500">
          Loading routes...
        </div>
      }
    >
      <Routes>
        {/* Default redirect */}
        <Route
          path="/"
          element={<Navigate to={getDefaultRouteByRole(user?.role)} replace />}
        />

        {routeConfig.map((route) => {
          const element = route.protected ? (
            <RoleWrapper roles={route.roles} element={route.element} />
          ) : (
            route.element
          );

          return (
            <Route key={route.path} path={route.path} element={element} />
          );
        })}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;