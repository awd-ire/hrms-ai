import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "@/components/layout/AppShell";
import ProtectedRoute from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/hooks/useAuth";
import { getLandingRouteByRole } from "@/utils/landingRoute";

/**
 * Pages (placeholders will be replaced by next modules)
 */
const LoginPage = React.lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = React.lazy(() => import("@/pages/auth/RegisterPage"));

const AdminDashboard = React.lazy(() => import("@/pages/dashboard/AdminDashboard"));
const ManagerDashboard = React.lazy(() => import("@/pages/dashboard/ManagerDashboard"));
const HRDashboard = React.lazy(() => import("@/pages/dashboard/HRDashboard"));
const EmployeeDashboard = React.lazy(() => import("@/pages/dashboard/EmployeeDashboard"));
const DepartmentManagement = React.lazy(() => import("@/pages/admin/DepartmentManagement"));
const UserManagement = React.lazy(() => import("@/pages/admin/UserManagement"));
const ManagerApprovalQueue = React.lazy(() => import("@/pages/manager/ApprovalQueue"));
const ManagerTeamOverview = React.lazy(() => import("@/pages/manager/TeamOverview"));
const ManagerTeamAttendance = React.lazy(() => import("@/pages/manager/TeamAttendance"));
const GoalTracker = React.lazy(() => import("@/pages/performance/GoalTracker"));
const AttendanceAnalytics = React.lazy(() => import("@/pages/attendance/AttendanceAnalytics"));

// Additional pages referenced by the Sidebar
const EmployeeDirectory = React.lazy(() => import("@/pages/employees/EmployeeDirectory"));
const EmployeeDirectoryView = React.lazy(() => import("@/pages/employees/EmployeeDirectoryView"));
const MyAttendance = React.lazy(() => import("@/pages/attendance/MyAttendance"));
const MyLeave = React.lazy(() => import("@/pages/leave/MyLeave"));
const MyPayslips = React.lazy(() => import("@/pages/payroll/MyPayslips"));
const MyPerformance = React.lazy(() => import("@/pages/performance/MyPerformance"));
const RecruitmentPipeline = React.lazy(() => import("@/pages/recruitment/RecruitmentPipeline"));
const AIResumeScreen = React.lazy(() => import("@/pages/ai/AIResumeScreen"));
const InterviewWorkspace = React.lazy(() => import("@/pages/hr/InterviewWorkspace"));
const CandidatePortal = React.lazy(() => import("@/pages/public/CandidatePortal"));

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

const LandingRoute = () => {
  const { user } = useAuth();
  return <Navigate to={getLandingRouteByRole(user?.role)} replace />;
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
              <Route path="/" element={<LandingRoute />} />

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

              <Route
                path="/manager/approvals"
                element={
                  <RoleRoute
                    allowedRoles={["senior_manager"]}
                    element={<ManagerApprovalQueue />}
                  />
                }
              />

              <Route
                path="/manager/team"
                element={
                  <RoleRoute
                    allowedRoles={["senior_manager"]}
                    element={<ManagerTeamOverview />}
                  />
                }
              />

              <Route
                path="/manager/performance"
                element={
                  <RoleRoute
                    allowedRoles={["senior_manager"]}
                    element={<GoalTracker />}
                  />
                }
              />

              <Route
                path="/manager/attendance"
                element={
                  <RoleRoute
                    allowedRoles={["senior_manager"]}
                    element={<ManagerTeamAttendance />}
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
                    allowedRoles={["admin", "senior_manager", "hr_recruiter"]}
                    element={<EmployeeDirectoryView />}
                  />
                }
              />

              <Route
                path="/admin/departments"
                element={
                  <RoleRoute
                    allowedRoles={["admin"]}
                    element={<DepartmentManagement />}
                  />
                }
              />

              <Route
                path="/admin/users"
                element={
                  <RoleRoute
                    allowedRoles={["admin"]}
                    element={<UserManagement />}
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
                    element={<MyLeave />}
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

              <Route
                path="/employee/performance"
                element={
                  <RoleRoute
                    allowedRoles={["employee"]}
                    element={<MyPerformance />}
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

              <Route
                path="/hr/interview"
                element={
                  <RoleRoute
                    allowedRoles={["hr_recruiter"]}
                    element={<InterviewWorkspace />}
                  />
                }
              />

              <Route
                path="/hr/candidate-portal"
                element={
                  <RoleRoute
                    allowedRoles={["hr_recruiter"]}
                    element={<CandidatePortal />}
                  />
                }
              />

              <Route
                path="/careers"
                element={
                  <RoleRoute
                    allowedRoles={["candidate"]}
                    element={<CandidatePortal />}
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
