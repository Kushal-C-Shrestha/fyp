export const normalizeRole = (role) => {
  return String(role || "")
    .toLowerCase()
    .trim()
};

const roleRouteMap = {
  user: "/profile/appointments",
  doctor: "/dashboard/doctor",
  hospital: "/dashboard/hospital",
  admin: "/dashboard/super-admin",
};

export const getDefaultRouteForRole = (role) => {
  const normalizedRole = normalizeRole(role);
  return roleRouteMap[normalizedRole] || "/profile/appointments";
};

export const hasAllowedRole = (userRole, allowedRoles = []) => {
  const normalizedUserRole = normalizeRole(userRole);
  return allowedRoles.some((role) => normalizeRole(role) === normalizedUserRole);
};
