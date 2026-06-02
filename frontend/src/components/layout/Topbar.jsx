import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

/**
 * Topbar contains:
 * - mobile menu toggle
 * - theme toggle
 * - user info
 */
const Topbar = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 bg-white dark:bg-gray-800 border-b dark:border-gray-700 flex items-center justify-between px-4">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden text-gray-700 dark:text-gray-200"
        >
          ☰
        </button>

        <h2 className="text-sm md:text-base font-semibold text-gray-800 dark:text-white">
          Enterprise HRMS
        </h2>
      </div>

      {/* Right */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="text-sm px-3 py-1 rounded-md border dark:border-gray-600 text-gray-700 dark:text-gray-200"
        >
          {theme === "light" ? "Dark" : "Light"}
        </button>

        <div className="text-sm text-gray-700 dark:text-gray-200">
          {user?.username || "User"}
        </div>

        <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
          {user?.username?.charAt(0)?.toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
};

export default Topbar;