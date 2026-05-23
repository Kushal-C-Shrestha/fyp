import express from "express"
import adminRoutes from "./admin.routes.js"
import authRoutes from "./auth.routes.js"
import blogRoutes from "./blog.routes.js"
import documentRoutes from "./document.routes.js"
import docRoutes from "./doctor.routes.js"
import appointmentRoutes from "./appointment.routes.js"
import recordRoutes from "./record.routes.js"
import doctorRequestRoutes from './doctorRequest.routes.js'
import hospitalRequestRoutes from './hospitalRequest.routes.js'
import { authenticateUser } from "../middlewares/auth.middleware.js";
import hospitalRoutes from "./hospital.routes.js";
import notificationRoutes from "./notification.routes.js";
import reviewRoutes from "./review.routes.js";
import specialitiesRoutes from "./specialities.routes.js";
import contactRoutes from './contact.routes.js'
import chatbotRoutes from './chatbot.routes.js'
import videoCallRoutes from "./videoCall.routes.js";
const router = express.Router();

router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);
router.use('/blogs', blogRoutes);
router.use('/documents', authenticateUser, documentRoutes);
router.use('/doctors', docRoutes);
router.use('/specialities', specialitiesRoutes);
router.use('/specializations', specialitiesRoutes);
router.use('/hospitals', hospitalRoutes);
router.use('/appointments', authenticateUser, appointmentRoutes)
router.use('/notifications', authenticateUser, notificationRoutes);
router.use('/records', authenticateUser, recordRoutes)
router.use('/reviews', reviewRoutes);
router.use('/video-call', videoCallRoutes);
router.use('/doctor-requests', doctorRequestRoutes)
router.use('/hospital-requests', hospitalRequestRoutes)
router.use('/contact', contactRoutes)
router.use('/assistant', chatbotRoutes)
export default router;

