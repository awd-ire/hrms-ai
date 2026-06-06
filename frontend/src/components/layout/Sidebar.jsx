import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getRoleTheme } from "@/utils/roleTheme";
import { hasRoleAtLeast } from "@/utils/roleHierarchy";

/**
 * Role-based navigation configuration
 */
const navConfig = [
  { label: "Dashboard", path: "/admin", minRole: "admin" },
  { label: "Dashboard", path: "/manager", minRole: "senior_manager" },
  { label: "HR Dashboard", path: "/hr", minRole: "hr_recruiter" },
  { label: "My Dashboard", path: "/employee", roles: ["employee"] },
  { label: "Manage Employees", path: "/employees", minRole: "hr_recruiter" },
  { label: "User Management", path: "/admin/users", roles: ["admin"] },
  { label: "Departments", path: "/admin/departments", roles: ["admin"] },
  { label: "Employee Directory", path: "/directory", minRole: "hr_recruiter" },
  { label: "Leave Approvals", path: "/manager/approvals", minRole: "senior_manager" },
  { label: "Team Overview", path: "/manager/team", minRole: "senior_manager" },
  { label: "Performance", path: "/manager/performance", minRole: "senior_manager" },
  { label: "Attendance", path: "/manager/attendance", minRole: "senior_manager" },
  { label: "Attendance", path: "/employee/attendance", roles: ["employee"] },
  { label: "Leave", path: "/employee/leave", roles: ["employee"] },
  { label: "Payroll", path: "/employee/payslips", roles: ["employee"] },
  { label: "Performance", path: "/employee/performance", roles: ["employee"] },
  { label: "Recruitment", path: "/hr/recruitment", minRole: "hr_recruiter" },
  { label: "Interview Workspace", path: "/hr/interview", minRole: "hr_recruiter" },
  { label: "AI Resume Screen", path: "/hr/resume-screen", minRole: "hr_recruiter" },
  { label: "Analytics", path: "/analytics/company", minRole: "admin" },
];

const Sidebar = ({ open, onClose }) => {
  const { logout, user } = useAuth();
  const { role } = usePermissions();
  const roleTheme = getRoleTheme(role);

  const filteredNav = navConfig.filter((item) => {
    if (item.minRole) {
      return hasRoleAtLeast(role, item.minRole);
    }

    return item.roles.includes(role);
  });

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static z-50 h-full w-64 transform transition-transform duration-200 ${roleTheme.sidebarClass} ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="p-4 border-b border-white/10">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
            <h1 className="text-xl font-bold text-white">HRMS AI</h1>
            <p className="mt-1 text-xs uppercase tracking-[0.3em] text-white/60">
              {roleTheme.roleLabel}
            </p>
            <p className="mt-3 text-sm text-white/70">
              {user?.role}
            </p>
          </div>
        </div>

        <nav className="p-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end
              onClick={onClose}
              className={({ isActive }) =>
                `block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? roleTheme.sidebarActiveClass
                    : `text-white/80 ${roleTheme.sidebarHoverClass}`
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t border-white/10 bg-black/10">
          <button
            onClick={logout}
            className="w-full rounded-xl bg-white/10 px-3 py-2 text-white transition hover:bg-white/20"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
