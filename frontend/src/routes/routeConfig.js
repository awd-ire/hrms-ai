import React from "react";
import { getLandingRouteByRole } from "@/utils/landingRoute";

/**
 * Lazy-loaded pages (enterprise performance requirement)
 */
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/auth/RegisterPage"));

const AdminDashboard = React.lazy(() => import("@/pages/dashboard/AdminDashboard"));
const ManagerDashboard = React.lazy(() => import("@/pages/dashboard/ManagerDashboard"));
const HRDashboard = React.lazy(() => import("@/pages/dashboard/HRDashboard"));
const HRRecruitmentPipeline = React.lazy(() => import("@/pages/hr/RecruitmentPipeline"));
const HRInterviewWorkspace = React.lazy(() => import("@/pages/hr/InterviewWorkspace"));
const HRCandidatePortal = React.lazy(() => import("@/pages/public/CandidatePortal"));
const EmployeeDashboard = React.lazy(() => import("@/pages/dashboard/EmployeeDashboard"));
const DepartmentManagement = React.lazy(() => import("@/pages/admin/DepartmentManagement"));
const UserManagement = React.lazy(() => import("@/pages/admin/UserManagement"));
const ManagerApprovalQueue = React.lazy(() => import("@/pages/manager/ApprovalQueue"));
const ManagerTeamOverview = React.lazy(() => import("@/pages/manager/TeamOverview"));
const ManagerTeamAttendance = React.lazy(() => import("@/pages/manager/TeamAttendance"));
const GoalTracker = React.lazy(() => import("@/pages/performance/GoalTracker"));
const AttendanceAnalytics = React.lazy(() => import("@/pages/attendance/AttendanceAnalytics"));
const MyLeave = React.lazy(() => import("@/pages/leave/MyLeave"));
const MyPerformance = React.lazy(() => import("@/pages/performance/MyPerformance"));
const AIResumeScreen = React.lazy(() => import("@/pages/ai/AIResumeScreen"));

/**
 * Route roles:
 * - admin
 * - senior_manager
 * - hr_recruiter
 * - employee
 * - candidate
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

  {
    path: "/admin/departments",
    element: <DepartmentManagement />,
    protected: true,
    roles: ["admin"]
  },

  {
    path: "/admin/users",
    element: <UserManagement />,
    protected: true,
    roles: ["admin", "senior_manager", "hr_recruiter"]
  },

  // Manager
  {
    path: "/manager",
    element: <ManagerDashboard />,
    protected: true,
    roles: ["senior_manager"]
  },

  {
    path: "/manager/approvals",
    element: <ManagerApprovalQueue />,
    protected: true,
    roles: ["senior_manager"]
  },

  {
    path: "/manager/team",
    element: <ManagerTeamOverview />,
    protected: true,
    roles: ["senior_manager"]
  },

  {
    path: "/manager/performance",
    element: <GoalTracker />,
    protected: true,
    roles: ["senior_manager"]
  },

  {
    path: "/manager/attendance",
    element: <ManagerTeamAttendance />,
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

  {
    path: "/hr/resume-screen",
    element: <AIResumeScreen />,
    protected: true,
    roles: ["hr_recruiter"]
  },

  {
    path: "/hr/recruitment",
    element: <HRRecruitmentPipeline />,
    protected: true,
    roles: ["hr_recruiter"]
  },

  {
    path: "/hr/interview",
    element: <HRInterviewWorkspace />,
    protected: true,
    roles: ["hr_recruiter"]
  },

  {
    path: "/hr/candidate-portal",
    element: <HRCandidatePortal />,
    protected: true,
    roles: ["hr_recruiter"]
  },

  {
    path: "/careers",
    element: <HRCandidatePortal />,
    protected: true,
    roles: ["candidate"]
  },

  // Employee
  {
    path: "/employee",
    element: <EmployeeDashboard />,
    protected: true,
    roles: ["employee"]
  },

  {
    path: "/employee/leave",
    element: <MyLeave />,
    protected: true,
    roles: ["employee"]
  },

  {
    path: "/employee/performance",
    element: <MyPerformance />,
    protected: true,
    roles: ["employee"]
  }
];

/**
 * Helper: get dashboard route based on role
 */
export const getDefaultRouteByRole = (role) => {
  return getLandingRouteByRole(role);
};
