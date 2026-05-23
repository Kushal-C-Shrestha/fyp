import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { getDefaultRouteForRole, normalizeRole } from "../utils/roleRouting.js";

const restrictedPublicRoles = new Set([
  "doctor",
  "hospital",
  "admin",
]);

const PublicRoute = () => {
  const { user } = useAuth();
  const userRole = normalizeRole(user?.role);

  if (user && restrictedPublicRoles.has(userRole)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return <Outlet />;
};

export default PublicRoute;
