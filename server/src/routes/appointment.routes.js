import express from "express";
import { bookAppointment, getAppointmentById, completeAppointment, rescheduleAppointment, cancelAppointment, getAppointments, attachRecords } from "../controllers/appointment.controller.js";
import { authenticateUser, authorizeRole } from "../middlewares/auth.middleware.js";
import { rateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

router.get('/', getAppointments);

router.post('/',
    rateLimiter({ prefix: "book-appt", max: 10, windowSec: 3600 }),
    bookAppointment
);

router.get('/:id', getAppointmentById);

router.post('/:id/records', attachRecords);

// Reschedule/cancel: 10 per IP per hour
router.put('/:id/reschedule',
    rateLimiter({ prefix: "reschedule-appt", max: 10, windowSec: 3600 }),
    rescheduleAppointment
);
router.put('/:id/cancel',
    rateLimiter({ prefix: "cancel-appt", max: 10, windowSec: 3600 }),
    cancelAppointment
);
router.put('/:id/complete', authorizeRole("doctor"), completeAppointment);

export default router;
