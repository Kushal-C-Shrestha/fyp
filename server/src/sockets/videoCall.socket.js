import {
    handleJoinRoom,
    handleJoinAppointmentRoom,
    handleOfferRequest,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    handleToggleMedia,
    handleLeaveRoom,
    handleEndCall,
    handleChatMessage,
    handleDisconnect,
} from "./handlers/videoCall.handlers.js";

export const videoCallSocket = (io) => {
    io.on("connection", (socket) => {
        socket.on("join-appointment-room", (data) => handleJoinAppointmentRoom(io, socket, data));

        // WebRTC room & signaling
        socket.on("join-room", (data) => handleJoinRoom(io, socket, data));
        socket.on("offer-request", (data) => handleOfferRequest(io, socket, data));
        socket.on("offer", (data) => handleOffer(io, socket, data));
        socket.on("answer", (data) => handleAnswer(io, socket, data));
        socket.on("ice-candidate", (data) => handleIceCandidate(io, socket, data));
        socket.on("toggle-media", (data) => handleToggleMedia(io, socket, data));
        socket.on("leave-room", (data) => handleLeaveRoom(io, socket, data));
        socket.on("end-call", (data) => handleEndCall(io, socket, data));

        socket.on("chat-message", (data) => handleChatMessage(io, socket, data));

        socket.on("disconnect", () => handleDisconnect(io, socket));
    });
};
