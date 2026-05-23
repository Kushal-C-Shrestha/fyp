import api from "./axios.js";
import { SESSION_EXPIRED_MESSAGE, isSessionExpiredText } from "../utils/errorMessages.js";

let isRefreshing = false;
let failedQueue = [];
let requestInterceptorId = null;
let responseInterceptorId = null;

const AUTH_ENDPOINTS = [
    "/auth/login",
    "/auth/register",
    "/auth/logout",
    "/auth/refresh",
];

const isAuthEndpoint = (url = "") =>
    AUTH_ENDPOINTS.some((endpoint) => String(url).includes(endpoint));

const isExpiredAuthError = (error) => {
    const status = error?.response?.status;
    const data = error?.response?.data || {};
    const messages = [
        data.message,
        data.error,
        data.detail,
        error?.message,
    ].filter(Boolean);

    return (status === 401 || status === 403) && messages.some(isSessionExpiredText);
};

const createSessionExpiredError = (sourceError) => {
    const error = sourceError instanceof Error ? sourceError : new Error(SESSION_EXPIRED_MESSAGE);
    error.message = SESSION_EXPIRED_MESSAGE;
    error.isSessionExpired = true;
    error.response = {
        ...(sourceError?.response || {}),
        data: {
            ...(sourceError?.response?.data || {}),
            message: SESSION_EXPIRED_MESSAGE,
            error: SESSION_EXPIRED_MESSAGE,
            detail: SESSION_EXPIRED_MESSAGE,
        },
    };
    return error;
};

const processQueue = (error, token = null) => {
    failedQueue.forEach((p) => {
        if (error) {
            p.reject(error);
        } else {
            p.resolve(token);
        }
    });
    failedQueue = [];
};

export const setupInterceptors = ({
    getAccessToken,
    setAccessToken,
    logout,
}) => {
    // Prevent stacking duplicate interceptors across re-renders.
    if (requestInterceptorId !== null) {
        api.interceptors.request.eject(requestInterceptorId);
        requestInterceptorId = null;
    }
    if (responseInterceptorId !== null) {
        api.interceptors.response.eject(responseInterceptorId);
        responseInterceptorId = null;
    }

    /* ==============================
       REQUEST INTERCEPTOR
    ============================== */
    requestInterceptorId = api.interceptors.request.use(
        (config) => {
            if (config.skipAuthRefresh || config.url?.includes("/auth/refresh")) {
                return config;
            }

            const token = getAccessToken();
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }

            return config;
        },
        (error) => Promise.reject(error)
    );

    /* ==============================
       RESPONSE INTERCEPTOR
    ============================== */
    responseInterceptorId = api.interceptors.response.use(
        (response) => response,
        async (error) => {
            const originalRequest = error.config;

            if (!originalRequest || originalRequest.skipAuthRefresh) {
                return Promise.reject(isExpiredAuthError(error) ? createSessionExpiredError(error) : error);
            }

            if (isAuthEndpoint(originalRequest.url)) {
                if (originalRequest?.url?.includes("/auth/refresh")) {
                    await logout({ skipServer: true });
                    return Promise.reject(createSessionExpiredError(error));
                }
                return Promise.reject(isExpiredAuthError(error) ? createSessionExpiredError(error) : error);
            }

            if (error.response?.status === 401 && originalRequest._retry) {
                await logout({ skipServer: true });
                return Promise.reject(createSessionExpiredError(error));
            }

            if (error.response?.status === 401 && !originalRequest._retry) {
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        failedQueue.push({
                            resolve: (token) => {
                                originalRequest.headers = originalRequest.headers || {};
                                originalRequest.headers.Authorization = `Bearer ${token}`;
                                resolve(api(originalRequest));
                            },
                            reject,
                        });
                    });
                }

                originalRequest._retry = true;
                isRefreshing = true;

                try {
                    const { data } = await api.post(
                        "/auth/refresh",
                        {},
                        { skipAuthRefresh: true }
                    );
                    const newAccessToken = data.accessToken;

                    if (!newAccessToken) {
                        throw new Error("Refresh did not return an access token.");
                    }

                    setAccessToken(newAccessToken);
                    processQueue(null, newAccessToken);

                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                } catch (err) {
                    const sessionError = createSessionExpiredError(err);
                    processQueue(sessionError, null);
                    await logout({ skipServer: true });
                    return Promise.reject(sessionError);
                } finally {
                    isRefreshing = false;
                }
            }

            if (isExpiredAuthError(error)) {
                await logout({ skipServer: true });
                return Promise.reject(createSessionExpiredError(error));
            }

            return Promise.reject(error);
        }
    );
};
