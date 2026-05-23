import { createContext, useCallback, useContext, useState, useEffect } from "react";
import api from "../api/axios";
import socket from "../lib/socket";

export const AuthContext = createContext(null);

export const AuthContextProvider = ({ children }) => {
    const [accessToken, setAccessTokenRaw] = useState(null);
    const [user, setUser] = useState(null);

    useEffect(() => {
        if (user) {
            socket.connect();
            socket.emit("join-notification-room", { userId: user.id });

            return () => {
                socket.disconnect();
            };
        }
    }, [user]);

    const setAccessToken = useCallback((token) => {
        setAccessTokenRaw(token);
    }, []);

    const login = useCallback((token, user) => {
        setAccessToken(token);
        setUser(user);
    }, [setAccessToken]);

    const logout = useCallback(async ({ skipServer = false } = {}) => {
        try {
            if (!skipServer) {
                await api.post("/auth/logout", {}, { skipAuthRefresh: true });
            }
        } catch {
            // Ignore network/server failure and still clear local auth state.
        } finally {
            setAccessToken(null);
            setUser(null);
        }
    }, [setAccessToken]);

    return (
        <AuthContext.Provider
            value={{
                accessToken,
                user,
                setAccessToken,
                setUser,
                login,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export { useAuth } from "../hooks/useAuth";
