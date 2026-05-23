import express from "express";
import {
    getAllDoctors,
    getDoctorById,
    getAvailableSlotsForDoctor,
    getDoctorAssignmentRequests,
    createDoctorAssignmentRequest,
    reviewDoctorAssignmentRequestByDoctor,
    getDoctorLeaveRequests,
    createDoctorLeaveRequest,
    deleteDoctorLeaveRequest,
    createDoctorScheduleChangeRequest,
    getDoctorAssignments,
    removeDoctorHospitalAssignment,
    getDoctorSettings,
    updateDoctorSettings
} from "../controllers/doctor.controller.js";
import {
    getReviewsForSingleDoctor,
    createReview,
    getDoctorReviewEligibility
} from "../controllers/review.controller.js";
import { authenticateUser, ensureOwnership } from "../middlewares/auth.middleware.js";
import { cache } from "../middlewares/cache.middleware.js";

const router = express.Router();

router.get("/me/settings", authenticateUser, getDoctorSettings);
router.put("/me/settings", authenticateUser, updateDoctorSettings);

router.get("/", cache(300, "doctors"), getAllDoctors);
router.get("/:id", cache(600, "doctors"), getDoctorById);

router.get("/:id/availability", cache(90, "doctors"), getAvailableSlotsForDoctor);
router.get("/:id/reviews", cache(600, "doctors"), getReviewsForSingleDoctor);
router.get("/:id/reviews/eligibility", authenticateUser, getDoctorReviewEligibility);
router.post("/:id/reviews", authenticateUser, createReview);

router.get("/:id/assignment-requests", authenticateUser, ensureOwnership(), getDoctorAssignmentRequests);
router.post("/:id/assignment-requests", authenticateUser, ensureOwnership(), createDoctorAssignmentRequest);
router.put("/assignment-requests/:requestId/review", authenticateUser, reviewDoctorAssignmentRequestByDoctor);
router.get("/:id/leave-requests", authenticateUser, ensureOwnership(), getDoctorLeaveRequests);
router.post("/:id/leave-requests", authenticateUser, ensureOwnership(), createDoctorLeaveRequest);
router.delete("/:id/leave-requests/:leaveId", authenticateUser, ensureOwnership(), deleteDoctorLeaveRequest);
router.post("/:id/schedule-change-requests", authenticateUser, ensureOwnership(), createDoctorScheduleChangeRequest);
router.get("/:id/assignments", authenticateUser, ensureOwnership(), getDoctorAssignments);
router.delete("/:id/assignments/:assignmentId", authenticateUser, removeDoctorHospitalAssignment);



export default router;
