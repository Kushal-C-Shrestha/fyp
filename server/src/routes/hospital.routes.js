import express from "express";
import { getDoctorFromSingleHospital } from "../controllers/doctor.controller.js";
import {
    getAllHospitals,
    searchHospitals,
    getHospitalById,
    getMyHospitalContext,
    getHospitalDoctorAssignmentRequests,
    createHospitalDoctorAssignmentRequest,
    reviewDoctorAssignmentRequest,
    getHospitalScheduleRequests,
    reviewHospitalScheduleRequest,
    getHospitalPatients,
    createHospitalAppointment,
    getHospitalDashboardStats,
} from "../controllers/hospital.controller.js";
import { getReviewsForSingleHospital, createReview, getHospitalReviewEligibility } from "../controllers/review.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import { cache } from "../middlewares/cache.middleware.js";

const router = express.Router();

router.get("/", cache(300, "hospitals"), getAllHospitals);
router.get("/search", cache(300, "hospitals"), searchHospitals);
router.get("/me", authenticateUser, getMyHospitalContext);
router.get("/me/patients", authenticateUser, getHospitalPatients);
router.get("/me/assignment-requests", authenticateUser, getHospitalDoctorAssignmentRequests);
router.post("/me/assignment-requests", authenticateUser, createHospitalDoctorAssignmentRequest);
router.put("/me/assignment-requests/:requestId/review", authenticateUser, reviewDoctorAssignmentRequest);
router.get("/me/schedule-requests", authenticateUser, getHospitalScheduleRequests);
router.put("/me/schedule-requests/:requestId/review", authenticateUser, reviewHospitalScheduleRequest);
router.get("/me/stats", authenticateUser, getHospitalDashboardStats);
router.post("/me/appointments", authenticateUser, createHospitalAppointment);

router.get("/:id/doctors", cache(300, "hospitals"), getDoctorFromSingleHospital);
router.get("/:hospitalId/reviews", cache(600, "hospitals"), getReviewsForSingleHospital);
router.get("/:id/reviews/eligibility", authenticateUser, getHospitalReviewEligibility);
router.post("/:id/reviews", authenticateUser, createReview);
router.get("/:id", cache(600, "hospitals"), getHospitalById);

export default router;
