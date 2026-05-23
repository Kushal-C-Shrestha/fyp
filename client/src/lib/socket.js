import { io } from "socket.io-client";

export const SOCKET_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, "") || "http://localhost:5000";

export const SOCKET_OPTIONS = {
  withCredentials: true,
  transports: ["websocket"],
};

export const createSocket = (options = {}) =>
  io(SOCKET_URL, {
    ...SOCKET_OPTIONS,
    ...options,
  });

const socket = createSocket({ autoConnect: false });

export default socket;
