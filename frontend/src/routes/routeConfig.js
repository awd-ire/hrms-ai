import React from "react";

/**
 * Lazy-loaded pages (enterprise performance requirement)
 */
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/auth/RegisterPage"));

const AdminDashboard = React.lazy(() => import("@/pages/dashboard/AdminDashboard"));
const ManagerDashboard = React.lazy(() => import("@/pages/dashboard/ManagerDashboard"));
const HRDashboard = React.lazy(() => import("@/pages/dashboard/HRDashboard"));
const EmployeeDashboard = React.lazy(() => import("@/pages/dashboard/EmployeeDashboard"));

/**
 * Route roles:
 * - admin
 * - senior_manager
 * - hr_recruiter
 * - employee
 */

export const routeConfig = [
  // Public routes
  {
    path: "/login",
    element: <LoginPage />,
    protected: false,
    roles: []
  },

  {
    path: "/register",
    element: <RegisterPage />,
    protected: false,
    roles: []
  },

  // Root redirect behavior handled in router
  {
    path: "/",
    element: <LoginPage />,
    protected: false,
    roles: []
  },

  // Admin
  {
    path: "/admin",
    element: <AdminDashboard />,
    protected: true,
    roles: ["admin"]
  },

  // Manager
  {
    path: "/manager",
    element: <ManagerDashboard />,
    protected: true,
    roles: ["senior_manager"]
  },

  // HR
  {
    path: "/hr",
    element: <HRDashboard />,
    protected: true,
    roles: ["hr_recruiter"]
  },

  // Employee
  {
    path: "/employee",
    element: <EmployeeDashboard />,
    protected: true,
    roles: ["employee"]
  }
];

/**
 * Helper: get dashboard route based on role
 */
export const getDefaultRouteByRole = (role) => {
  switch (role) {
    case "admin":
      return "/admin";
    case "senior_manager":
      return "/manager";
    case "hr_recruiter":
      return "/hr";
    case "employee":
      return "/employee";
    default:
      return "/login";
  }
};