import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { getDefaultRouteForRole } from "../utils/roleRouting.js";

const GuestRoute = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={getDefaultRouteForRole(user?.role)} replace />;
  }

  return <Outlet />;
};

export default GuestRoute;
