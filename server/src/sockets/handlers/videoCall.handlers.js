import jwt from "jsonwebtoken";
import {
    checkAppointmentAccess,
    checkUser,
    endCall,
    getAppointmentRoomName,
    sendAppointmentChatMessage,
} from "../../services/videoCall.service.js";

const roomParticipants = new Map();

const addToRoom = (roomId, socketId) => {
    if (!roomParticipants.has(roomId)) roomParticipants.set(roomId, new Set());
    roomParticipants.get(roomId).add(socketId);
};

const removeFromRoom = (roomId, socketId) => {
    const room = roomParticipants.get(roomId);
    if (!room) return;
    room.delete(socketId);
    if (room.size === 0) roomParticipants.delete(roomId);
};

const countInRoom = (roomId) => roomParticipants.get(roomId)?.size ?? 0;

const verifyToken = (token) => {
    try {
        return jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch {
        return null;
    }
};

export const handleJoinRoom = async (io, socket, data) => {
    if (!data) return;
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const { roomId, token } = parsed;

    if (!roomId) {
        socket.emit("join-error", { message: "Room ID is required." });
        return;
    }

    const user = verifyToken(token);
    if (!user) {
        socket.emit("join-error", { message: "Unauthorized. Invalid or expired token." });
        return;
    }

    const result = await checkUser(roomId);
    if (!result.success) {
        socket.emit("join-error", { message: result.message });
        return;
    }

    const { appointment } = result;
    const userId = Number(user.id ?? user.user_id);
    const isDoctor = userId === Number(appointment.doctor_id);
    const isPatient = userId === Number(appointment.patient_id);

    if (!isDoctor && !isPatient) {
        socket.emit("join-error", { message: "You are not authorized to join this room." });
        return;
    }

    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.role = isDoctor ? "doctor" : "patient";
    addToRoom(roomId, socket.id);

    const participants = countInRoom(roomId);
    socket.emit("join-success", { participants });

    if (participants >= 2) {
        socket.to(roomId).emit("peer-joined");
    } else {
        socket.to(roomId).emit("peer-present");
    }
};

export const handleOfferRequest = (io, socket, data) => {
    if (!data) return;
    const { roomId } = typeof data === "string" ? JSON.parse(data) : data;
    if (!roomId) return;
    socket.to(roomId).emit("offer-request");
};

export const handleOffer = (io, socket, data) => {
    if (!data) return;
    const { roomId, offer } = typeof data === "string" ? JSON.parse(data) : data;
    if (!roomId || !offer) return;
    socket.to(roomId).emit("offer", offer);
};

export const handleAnswer = (io, socket, data) => {
    if (!data) return;
    const { roomId, answer } = typeof data === "string" ? JSON.parse(data) : data;
    if (!roomId || !answer) return;
    socket.to(roomId).emit("answer", answer);
};

export const handleIceCandidate = (io, socket, data) => {
    if (!data) return;
    const { roomId, candidate } = typeof data === "string" ? JSON.parse(data) : data;
    if (!roomId || !candidate) return;
    socket.to(roomId).emit("ice-candidate", candidate);
};

export const handleToggleMedia = (io, socket, data) => {
    if (!data) return;
    const { roomId, isCameraOff, isMuted } = typeof data === "string" ? JSON.parse(data) : data;
    if (!roomId) return;
    socket.to(roomId).emit("media-state", { isCameraOff, isMuted });
};

export const handleLeaveRoom = (io, socket) => {
    const roomId = socket.data?.roomId;
    if (!roomId) return;
    socket.leave(roomId);
    removeFromRoom(roomId, socket.id);
    socket.to(roomId).emit("peer-left");
};

export const handleEndCall = async (io, socket, data) => {
    if (!data) return;
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const { roomId } = parsed;
    // Attempt to mark call ended in DB, but always notify room regardless
    await endCall({ roomId });
    io.to(roomId).emit("call-ended");
};

export const handleJoinAppointmentRoom = async (io, socket, data) => {
    if (!data) return;
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const { appointmentId, token } = parsed;

    const user = verifyToken(token);
    if (!user) return;

    const apptId = parseInt(appointmentId, 10);
    if (!apptId) return;

    const userId = Number(user.id ?? user.user_id);
    const access = await checkAppointmentAccess({ appointmentId: apptId, userId });
    if (!access.success) return;

    const appointmentRoom = getAppointmentRoomName(apptId);
    socket.join(appointmentRoom);
    socket.data.appointmentRoom = appointmentRoom;
};

export const handleChatMessage = async (io, socket, data) => {
    if (!data) return;
    const parsed = typeof data === "string" ? JSON.parse(data) : data;
    const { roomId, token, message } = parsed;

    if (!roomId || !message) {
        socket.emit("chat-error", { message: "Room ID and message are required." });
        return;
    }

    const user = verifyToken(token);
    if (!user) {
        socket.emit("chat-error", { message: "Unauthorized." });
        return;
    }

    const result = await checkUser(roomId);
    if (!result.success) {
        socket.emit("chat-error", { message: result.message });
        return;
    }

    const { appointment } = result;
    const userId = Number(user.id ?? user.user_id);
    if (userId !== Number(appointment.patient_id) && userId !== Number(appointment.doctor_id)) {
        socket.emit("chat-error", { message: "Unauthorized." });
        return;
    }

    try {
        const msgResult = await sendAppointmentChatMessage({
            appointmentId: appointment.appointment_id,
            userId,
            message,
        });

        io.to(roomId).emit("chat-message", {
            appointment_id: appointment.appointment_id,
            message: msgResult.message,
        });
    } catch (error) {
        socket.emit("chat-error", { message: error.message || "Failed to send message." });
    }
};

export const handleDisconnect = (io, socket) => {
    const roomId = socket.data?.roomId;
    if (roomId) {
        removeFromRoom(roomId, socket.id);
        socket.to(roomId).emit("peer-left");
    }
};
