import express from "express";
import {
    getOrCreateRoom,
    startCall,
    endCall,
    getDoctorScheduledCalls,
    getAppointmentChatMessages,
    sendAppointmentChatMessage,
    viewAppointmentChatAttachment,
} from "../controllers/videoCall.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import uploadAppointmentChatAttachment from "../middlewares/uploadAppointmentChatAttachment.middleware.js";
const router = express.Router();

router.get("/doctor/scheduled", authenticateUser, getDoctorScheduledCalls);
router.get("/room/:appointmentId", authenticateUser, getOrCreateRoom);
router.get("/chat/:appointmentId", authenticateUser, getAppointmentChatMessages);
router.get("/chat/attachment/:messageId", authenticateUser, viewAppointmentChatAttachment);

router.post("/start/:appointmentId", authenticateUser, startCall);
router.post("/end/:appointmentId", authenticateUser, endCall);
router.post("/chat/:appointmentId", authenticateUser, uploadAppointmentChatAttachment.single("attachment"), sendAppointmentChatMessage);

export default router;
