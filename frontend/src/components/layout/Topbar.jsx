import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { getRoleTheme } from "@/utils/roleTheme";

/**
 * Topbar contains:
 * - mobile menu toggle
 * - theme toggle
 * - user info
 */
const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const roleTheme = getRoleTheme(user?.role);

  return (
    <header className={`h-14 backdrop-blur border-b flex items-center justify-between px-4 ${roleTheme.topbarClass}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className={`md:hidden ${roleTheme.accentClass}`}
          aria-label="Open navigation"
        >
          ☰
        </button>

        <div>
          <h2 className="text-sm md:text-base font-semibold text-gray-800 dark:text-white">
            Enterprise HRMS
          </h2>
          <p className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            {roleTheme.roleLabel}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className={`text-sm px-3 py-1 rounded-full border border-current/20 ${roleTheme.accentClass}`}
        >
          {theme === "light" ? "Dark" : "Light"}
        </button>

        <div className="hidden md:block text-right">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {user?.username || "User"}
          </div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
            {user?.role}
          </div>
        </div>

        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${roleTheme.avatarClass}`}>
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
};

export default Topbar;
