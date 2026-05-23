import * as reviewService from "../services/review.service.js";

const getReviewsForSingleDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const reviews = await reviewService.getReviewsForSingleDoctor(id);
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getReviewsForSingleHospital = async (req, res) => {
    try {
        const { hospitalId } = req.params;
        const reviews = await reviewService.getReviewsForSingleHospital(hospitalId);
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const createReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId } = req.user;
        const { rating, comment } = req.body;
        const entity = req.originalUrl.includes('/doctor') ? 'doctor' : 'hospital';

        const result = await reviewService.createReview(id, userId, entity, rating, comment);
        return res.status(201).json({ success: true, message: "Review created successfully", review_id: result.review_id });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getFeaturedReviews = async (req, res) => {
    try {
        const reviews = await reviewService.getFeaturedReviews(req.query?.limit);
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getMyReviews = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const reviews = await reviewService.getReviewsByUser(userId);
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getDoctorReviewEligibility = async (req, res) => {
    try {
        const doctorId = req.params.id || req.params.doctorId;
        const userId = req.user?.id ?? req.user?.user_id;
        const result = await reviewService.getDoctorReviewEligibility(doctorId, userId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalReviewEligibility = async (req, res) => {
    try {
        const hospitalId = req.params.id || req.params.hospitalId;
        const userId = req.user?.id ?? req.user?.user_id;
        const result = await reviewService.getHospitalReviewEligibility(hospitalId, userId);
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const updateMyReview = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const { rating, comment } = req.body || {};
        const review = await reviewService.updateMyReview(req.params.reviewId, userId, rating, comment);
        return res.status(200).json({ success: true, message: "Review updated successfully", review });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const deleteMyReview = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const result = await reviewService.deleteMyReview(req.params.reviewId, userId);
        return res.status(200).json({ success: true, message: "Review deleted successfully", review_id: result.review_id });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId } = req.user;
        const entity = req.originalUrl.includes('/doctor') ? 'doctor' : 'hospital';

        const result = await reviewService.deleteReview(id, userId, entity);
        return res.status(200).json({ success: true, message: "Review deleted successfully", review_id: result.review_id });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export {
    getReviewsForSingleDoctor,
    getReviewsForSingleHospital,
    createReview,
    getFeaturedReviews,
    getMyReviews,
    getDoctorReviewEligibility,
    getHospitalReviewEligibility,
    updateMyReview,
    deleteMyReview,
    deleteReview
};
