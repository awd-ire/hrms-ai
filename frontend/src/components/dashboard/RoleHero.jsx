import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getRoleTheme } from "@/utils/roleTheme";

const RoleHero = ({ title, subtitle, actions = [], eyebrow }) => {
  const { user } = useAuth();
  const theme = getRoleTheme(user?.role);

  return (
    <section className={`relative overflow-hidden rounded-3xl p-5 md:p-6 shadow-xl ${theme.heroClass}`}>
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -right-10 top-0 h-40 w-40 rounded-full bg-white/30 blur-3xl" />
        <div className="absolute left-8 bottom-0 h-32 w-32 rounded-full bg-black/20 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-white/80">
            {eyebrow || theme.roleLabel}
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base text-white/80">
              {subtitle}
            </p>
          </div>

          {actions.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {actions.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-medium transition ${action.variant === "soft" ? theme.heroSoftClass : "bg-white text-slate-950 hover:bg-white/90"}`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="grid min-w-[260px] gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
            <div className="text-xs uppercase tracking-[0.25em] text-white/60">
              Theme
            </div>
            <div className="mt-1 text-lg font-semibold">{theme.roleHint}</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RoleHero;
