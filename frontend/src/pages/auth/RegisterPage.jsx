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
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: "onSubmit",
    defaultValues: { role: "candidate" },
  });

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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 px-4 py-8">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-white/95 shadow-2xl backdrop-blur dark:bg-slate-900/95">
        <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 px-6 py-6 text-white">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-100">Candidate Registration</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create your candidate account</h1>
          <p className="mt-2 text-sm leading-6 text-cyan-50/90">
            Public registration is only for candidates. Admin, manager, and HR accounts are created internally.
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register("role")} value="candidate" />

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Username</label>
              <input {...register("username")} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-500/20" />
              {errors.username && <p className="text-xs text-rose-500">{errors.username.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
              <input {...register("email")} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-500/20" />
              {errors.email && <p className="text-xs text-rose-500">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Password</label>
              <input type="password" {...register("password")} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:ring-cyan-500/20" />
              {errors.password && <p className="text-xs text-rose-500">{errors.password.message}</p>}
            </div>

            <div className="rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm text-cyan-800 dark:border-cyan-500/20 dark:bg-cyan-500/10 dark:text-cyan-100">
              This form creates a <span className="font-semibold">candidate</span> account only.
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-2xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:-translate-y-0.5 hover:from-cyan-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Registering..." : "Create Candidate Account"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-200 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:text-cyan-200"
              >
                Back to Login
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
