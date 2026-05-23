import express from "express";
import {
    getFeaturedReviews,
    getMyReviews,
    updateMyReview,
    deleteMyReview,
    getReviewsForSingleDoctor,
    getReviewsForSingleHospital,
    createReview
} from "../controllers/review.controller.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/featured", getFeaturedReviews);
router.get("/me", authenticateUser, getMyReviews);
router.put("/me/:reviewId", authenticateUser, updateMyReview);
router.delete("/me/:reviewId", authenticateUser, deleteMyReview);
router.get("/doctor/:id", getReviewsForSingleDoctor);
router.get("/hospital/:id", getReviewsForSingleHospital);
router.post("/doctor/:id", authenticateUser, createReview);
router.post("/hospital/:id", authenticateUser, createReview);

export default router;
