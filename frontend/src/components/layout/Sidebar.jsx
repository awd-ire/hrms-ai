import React from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

/**
 * Role-based navigation configuration
 */
const navConfig = [
  { label: "Dashboard", path: "/admin", roles: ["admin"] },
  { label: "Dashboard", path: "/manager", roles: ["senior_manager"] },
  { label: "HR Dashboard", path: "/hr", roles: ["hr_recruiter"] },
  { label: "My Dashboard", path: "/employee", roles: ["employee"] },

  { label: "Employees", path: "/employees", roles: ["admin", "senior_manager", "hr_recruiter"] },
  { label: "Directory", path: "/directory", roles: ["admin", "senior_manager", "hr_recruiter", "employee"] },

  { label: "Attendance", path: "/employee/attendance", roles: ["employee"] },
  { label: "Leave", path: "/employee/leave", roles: ["employee"] },
  { label: "Payroll", path: "/employee/payslips", roles: ["employee"] },

  { label: "Recruitment", path: "/hr/recruitment", roles: ["hr_recruiter"] },
  { label: "AI Resume Screen", path: "/hr/resume-screen", roles: ["hr_recruiter"] },

  { label: "Analytics", path: "/analytics/company", roles: ["admin", "senior_manager"] }
];

const Sidebar = ({ open, onClose }) => {
  const { logout, user } = useAuth();
  const { role } = usePermissions();

  const filteredNav = navConfig.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
        />
      )}

      <aside
        className={`
          fixed md:static z-50 h-full w-64 bg-white dark:bg-gray-800 border-r
          transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-4 border-b dark:border-gray-700">
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            HRMS AI
          </h1>
          <p className="text-sm text-gray-500">
            {user?.role}
          </p>
        </div>

        <nav className="p-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t dark:border-gray-700">
          <button
            onClick={logout}
            className="w-full px-3 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;