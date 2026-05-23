import express from "express";
import { 
    getAdminDoctorRequestById, 
    getAdminDoctorRequests, 
    getAdminDoctors, 
    getAdminHospitalRequestById, 
    getAdminHospitalRequests, 
    getAdminHospitals, 
    getAdminReviews, 
    getAdminStats, 
    getAdminUsers,
    deleteAdminDoctor,
    deleteAdminHospital
} from "../controllers/admin.controller.js";
import { authenticateUser, authorizeRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.use(authenticateUser);
router.use(authorizeRole(['admin', 'super_admin', 'main super admin', 'main_super_admin']));

router.get('/dashboard', (req, res) => {
    res.json({ message: 'Welcome to the admin dashboard!' });
});
router.get('/stats', getAdminStats);
router.get('/users', getAdminUsers);
router.get('/reports', (req, res) => {
    res.json({ message: 'List of reports' });
});
router.get('/settings', (req, res) => {
    res.json({ message: 'Admin settings' });
});
router.get('/analytics', (req, res) => {
    res.json({ message: 'Analytics data' });
});
router.get('/doctors', getAdminDoctors);
router.delete('/doctors/:id', deleteAdminDoctor);

router.get('/hospitals', getAdminHospitals);
router.delete('/hospitals/:id', deleteAdminHospital);

router.get('/appointments', (req, res) => {
    res.json({ message: 'List of appointments' });
});
router.get('/reviews', (req, res) => {
    return getAdminReviews(req, res);
});
router.get('/doctor-requests', getAdminDoctorRequests);
router.get('/doctor-requests/:requestId', getAdminDoctorRequestById);
router.get('/hospital-requests', getAdminHospitalRequests);
router.get('/hospital-requests/:requestId', getAdminHospitalRequestById);
router.get('/blog-requests', (req, res) => {
    res.json({ message: 'List of blog requests' });
});
router.get('/contacts', (req, res) => {
    res.json({ message: 'List of contact messages' });
});
router.get('/blogs', (req, res) => {
    res.json({ message: 'List of blogs' });
});
export default router;
