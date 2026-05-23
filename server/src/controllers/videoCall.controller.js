import fs from "fs";
import * as videoCallService from "../services/videoCall.service.js";

const sanitizeFileName = (value = "", fallback = "attachment") =>
    String(value || fallback)
        .replace(/[\r\n"]/g, "")
        .trim() || fallback;

const emitAppointmentCallStatus = ({ req, appointmentId, roomId, appointmentRoom, callStatus }) => {
    const io = req.app?.get?.("io");
    if (!io) return;

    const payload = {
        appointment_id: Number.parseInt(appointmentId, 10),
        room_id: roomId,
        call_status: callStatus,
    };

    if (roomId) io.to(roomId).emit("call-ended", payload);
    if (appointmentRoom) io.to(appointmentRoom).emit("appointment-call-status", payload);
};

export const getOrCreateRoom = async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const userId = req.user?.id ?? req.user?.user_id;
        const room = await videoCallService.getOrCreateRoom({ appointmentId, userId });
        return res.json(room);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Failed to get session" });
    }
};

export const startCall = async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user?.id;
    const role = req.user?.role;

    if (!String(role || "").toLowerCase().includes("doctor")) {
        return res.status(403).json({ error: "Only doctors can start a video call." });
    }

    try {
        const result = await videoCallService.startCall({ appointmentId, userId });
        if (!result.success) {
            return res.status(400).json({ error: result.message || "Failed to start call" });
        }
        const io = req.app?.get?.("io");
        if (io && result.appointment_room) {
            io.to(result.appointment_room).emit("appointment-call-status", {
                appointment_id: Number.parseInt(appointmentId, 10),
                room_id: result.room_id,
                call_status: result.call_status,
            });
        }
        return res.json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Failed to start call" });
    }
};

export const endCall = async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user?.id ?? req.user?.user_id;
    try {
        const result = await videoCallService.endCall({ appointmentId, userId });
        emitAppointmentCallStatus({
            req,
            appointmentId,
            roomId: result?.room_id,
            appointmentRoom: result?.appointment_room,
            callStatus: result?.call_status,
        });
        return res.json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Failed to end call" });
    }
};

export const getDoctorScheduledCalls = async (req, res) => {
    try {
        const normalizedRole = String(req.user?.role || req.user?.user_role || "").trim().toLowerCase();
        if (!normalizedRole.includes("doctor")) {
            return res.status(403).json({ error: "Only doctors can access scheduled video calls." });
        }

        const doctorId = req.user?.id ?? req.user?.user_id;
        const calls = await videoCallService.getDoctorScheduledCalls({ doctorId });
        return res.json({ success: true, calls: Array.isArray(calls) ? calls : [] });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Failed to fetch scheduled calls" });
    }
};

export const getAppointmentChatMessages = async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user?.id ?? req.user?.user_id;
    try {
        const result = await videoCallService.getAppointmentChatMessages({ appointmentId, userId });
        return res.json({ success: true, ...result });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Failed to load chat messages" });
    }
};

export const sendAppointmentChatMessage = async (req, res) => {
    const { appointmentId } = req.params;
    const userId = req.user?.id ?? req.user?.user_id;
    try {
        const result = await videoCallService.sendAppointmentChatMessage({
            appointmentId,
            userId,
            message: req.body?.message,
            attachment: req.file || null,
        });

        const io = req.app?.get?.("io");
        if (io && result?.appointment_room && result?.message) {
            io.to(result.appointment_room).emit("appointment-chat-message", {
                appointment_id: result.appointment_id,
                message: result.message,
            });
        }

        return res.status(201).json({ success: true, ...result });
    } catch (error) {
        if (req.file?.path && fs.existsSync(req.file.path)) {
            try { fs.unlinkSync(req.file.path); } catch { /* no-op */ }
        }
        return res.status(error.status || 500).json({ error: error.message || "Failed to send chat message" });
    }
};

export const viewAppointmentChatAttachment = async (req, res) => {
    const { messageId } = req.params;
    const userId = req.user?.id ?? req.user?.user_id;
    try {
        const attachment = await videoCallService.getAppointmentChatAttachment({ messageId, userId });
        res.setHeader("Content-Disposition", `inline; filename="${sanitizeFileName(attachment.file_name, "attachment")}"`);
        return res.sendFile(attachment.file_path, (error) => {
            if (error && !res.headersSent) res.status(500).send("Error opening file.");
        });
    } catch (error) {
        return res.status(error.status || 500).json({ error: error.message || "Failed to open chat attachment" });
    }
};
