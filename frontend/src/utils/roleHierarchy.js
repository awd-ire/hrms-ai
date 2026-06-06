export const ROLE_RANK = {
  employee: 0,
  hr_recruiter: 1,
  senior_manager: 2,
  admin: 3,
};

export const getRoleRank = (role) => ROLE_RANK[role] ?? -1;

export const hasRoleAtLeast = (role, minimumRole) => {
  if (!role || !minimumRole) return false;
  return getRoleRank(role) >= getRoleRank(minimumRole);
};

export const hasAnyRole = (role, allowedRoles = []) =>
  Boolean(role && allowedRoles.includes(role));
