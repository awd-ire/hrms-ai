import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/layout/ProtectedRoute";

/**
 * Pages (placeholders will be replaced by next modules)
 */
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/auth/RegisterPage"));

const AdminDashboard = React.lazy(() => import("@/pages/dashboard/AdminDashboard"));
const ManagerDashboard = React.lazy(() => import("@/pages/dashboard/ManagerDashboard"));
const HRDashboard = React.lazy(() => import("@/pages/dashboard/HRDashboard"));
const EmployeeDashboard = React.lazy(() => import("@/pages/dashboard/EmployeeDashboard"));

// Additional pages referenced by the Sidebar
const EmployeeDirectory = React.lazy(() => import("@/pages/employees/EmployeeDirectory"));
const MyAttendance = React.lazy(() => import("@/pages/attendance/MyAttendance"));
const LeaveRequestForm = React.lazy(() => import("@/pages/leave/LeaveRequestForm"));
const MyPayslips = React.lazy(() => import("@/pages/payroll/MyPayslips"));
const RecruitmentPipeline = React.lazy(() => import("@/pages/recruitment/RecruitmentPipeline"));
const AIResumeScreen = React.lazy(() => import("@/pages/ai/AIResumeScreen"));
const AttendanceAnalytics = React.lazy(() => import("@/pages/attendance/AttendanceAnalytics"));

/**
 * Error Boundary (simple enterprise-safe fallback)
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("App Error Boundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <h1 className="text-xl font-bold text-red-600">Something went wrong</h1>
            <p className="text-gray-600 mt-2">Please refresh the application</p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Role wrapper helper
 */
const RoleRoute = ({ allowedRoles, element }) => {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {element}
    </ProtectedRoute>
  );
};

/**
 * Main App Router
 */
const App = () => {
  return (
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <div className="h-screen flex items-center justify-center text-gray-500">
            Loading application...
          </div>
        }
      >
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected App Shell Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Navigate to="/login" replace />} />

              {/* Admin */}
              <Route
                path="/admin"
                element={
                  <RoleRoute
                    allowedRoles={["admin"]}
                    element={<AdminDashboard />}
                  />
                }
              />

              {/* Manager */}
              <Route
                path="/manager"
                element={
                  <RoleRoute
                    allowedRoles={["senior_manager"]}
                    element={<ManagerDashboard />}
                  />
                }
              />

              {/* HR */}
              <Route
                path="/hr"
                element={
                  <RoleRoute
                    allowedRoles={["hr_recruiter"]}
                    element={<HRDashboard />}
                  />
                }
              />

              {/* Employee */}
              <Route
                path="/employee"
                element={
                  <RoleRoute
                    allowedRoles={["employee"]}
                    element={<EmployeeDashboard />}
                  />
                }
              />

              {/* Employees / Directory */}
              <Route
                path="/employees"
                element={
                  <RoleRoute
                    allowedRoles={["admin", "senior_manager", "hr_recruiter"]}
                    element={<EmployeeDirectory />}
                  />
                }
              />

              <Route
                path="/directory"
                element={
                  <RoleRoute
                    allowedRoles={["admin", "senior_manager", "hr_recruiter", "employee"]}
                    element={<EmployeeDirectory />}
                  />
                }
              />

              {/* Employee-specific pages */}
              <Route
                path="/employee/attendance"
                element={
                  <RoleRoute
                    allowedRoles={["employee"]}
                    element={<MyAttendance />}
                  />
                }
              />

              <Route
                path="/employee/leave"
                element={
                  <RoleRoute
                    allowedRoles={["employee"]}
                    element={<LeaveRequestForm />}
                  />
                }
              />

              <Route
                path="/employee/payslips"
                element={
                  <RoleRoute
                    allowedRoles={["employee"]}
                    element={<MyPayslips />}
                  />
                }
              />

              {/* HR pages */}
              <Route
                path="/hr/recruitment"
                element={
                  <RoleRoute
                    allowedRoles={["hr_recruiter"]}
                    element={<RecruitmentPipeline />}
                  />
                }
              />

              <Route
                path="/hr/resume-screen"
                element={
                  <RoleRoute
                    allowedRoles={["hr_recruiter"]}
                    element={<AIResumeScreen />}
                  />
                }
              />

              {/* Analytics */}
              <Route
                path="/analytics/company"
                element={
                  <RoleRoute
                    allowedRoles={["admin", "senior_manager"]}
                    element={<AttendanceAnalytics />}
                  />
                }
              />
            </Route>
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </React.Suspense>
    </ErrorBoundary>
  );
};

export default App;