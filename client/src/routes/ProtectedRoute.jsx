import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { getDefaultRouteForRole, hasAllowedRole } from "../utils/roleRouting.js";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !hasAllowedRole(user?.role, allowedRoles)) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
