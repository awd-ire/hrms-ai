import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema } from "@/validation/authSchemas";
import { useNavigate } from "react-router-dom";
import api from "@/api/axios";

const RegisterPage = () => {
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: zodResolver(registerSchema), mode: "onSubmit" });

  const onSubmit = async (data) => {
    try {
      await api.post("/auth/register", data);
      navigate("/login", { replace: true });
    } catch (err) {
      // show minimal error via alert for now
      alert(err?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-white mb-6">Register</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">Username</label>
            <input {...register("username")} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:text-white" />
            {errors.username && <p className="text-xs text-red-500 mt-1">{errors.username.message}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">Email</label>
            <input {...register("email")} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:text-white" />
            {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">Password</label>
            <input type="password" {...register("password")} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:text-white" />
            {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label className="text-sm text-gray-700 dark:text-gray-200">Role</label>
            <select {...register("role")} className="w-full mt-1 p-2 border rounded dark:bg-gray-700 dark:text-white">
              <option value="employee">employee</option>
              <option value="hr_recruiter">hr_recruiter</option>
              <option value="senior_manager">senior_manager</option>
              <option value="admin">admin</option>
            </select>
            {errors.role && <p className="text-xs text-red-500 mt-1">{errors.role.message}</p>}
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={isSubmitting} className="flex-1 bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50">
              {isSubmitting ? "Registering..." : "Register"}
            </button>
            <button type="button" onClick={() => navigate('/login')} className="flex-1 bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300">
              Back to Login
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
