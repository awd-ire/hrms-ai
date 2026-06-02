import axios from "./axios";

export const dashboardApi = {
  admin: () => axios.get("/dashboard/admin"),
  hr: () => axios.get("/dashboard/hr"),
  manager: () => axios.get("/dashboard/manager"),
  employee: () => axios.get("/dashboard/employee")
};