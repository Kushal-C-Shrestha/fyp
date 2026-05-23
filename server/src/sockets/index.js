import { videoCallSocket } from "./videoCall.socket.js";
import { handleJoinNotificationRoom } from "./handlers/notification.handlers.js";

export default function initSockets(io) {
    videoCallSocket(io);

    io.on("connection", (socket) => {
        socket.on("join-notification-room", (data) => handleJoinNotificationRoom(io, socket, data));
    });
}