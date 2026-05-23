import React, { useEffect, useRef, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { setupInterceptors } from "./api/setupInterceptor.js";
import api from "./api/axios.js";

function App() {
  const { accessToken, setAccessToken, setUser, logout } = useAuth();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const tokenRef = useRef(accessToken);

  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  useEffect(() => {
    setupInterceptors({
      getAccessToken: () => tokenRef.current,
      setAccessToken,
      logout,
    });
  }, [setAccessToken, logout]);

  useEffect(() => {
    const initLogin = async () => {
      try {
        const { data } = await api.post(
          "/auth/refresh",
          {},
          { skipAuthRefresh: true }
        );
        setAccessToken(data.accessToken);
        setUser(data.user);
      } catch {
        // no-op
      } finally {
        setIsInitialLoading(false);
      }
    };

    if (!accessToken) initLogin();
    else setIsInitialLoading(false);
  }, [accessToken, setAccessToken, setUser]);

  if (isInitialLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_50%),#f6f8fb]">
        <div className="w-11 h-11 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
