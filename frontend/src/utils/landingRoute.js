export function getLandingRouteByRole(role) {
  switch (role) {
    case "admin":
      return "/admin";
    case "senior_manager":
      return "/manager";
    case "hr_recruiter":
      return "/hr";
    case "candidate":
      return "/careers";
    case "employee":
      return "/employee";
    default:
      return "/login";
  }
}
