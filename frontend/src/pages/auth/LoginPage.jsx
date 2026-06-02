import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/validation/authSchemas";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";

/**
 * Role-based redirect mapping (strict backend roles)
 */
const getRedirectPath = (role) => {
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

const LoginPage = () => {
  const { login, user, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: "onSubmit"
  });

  /**
   * Redirect if already authenticated
   */
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      navigate(getRedirectPath(user.role), { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const onSubmit = async (data) => {
    const res = await login(data);

    if (res?.success) {
      const role = res.user?.role || user?.role || "employee";
      navigate(getRedirectPath(role), { replace: true });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">
          HRMS Login
        </h1>

        {/* API Error */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Username */}
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">
              Username
            </label>
            <input
              {...register("username")}
              className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
              placeholder="Enter username"
            />
            {errors.username && (
              <p className="text-xs text-red-500 mt-1">
                {errors.username.message}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:text-white"
              placeholder="Enter password"
            />
            {errors.password && (
              <p className="text-xs text-red-500 mt-1">
                {errors.password.message}
              </p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">Enterprise HRMS System</p>
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="text-sm text-blue-600 hover:underline"
          >
            Register
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;