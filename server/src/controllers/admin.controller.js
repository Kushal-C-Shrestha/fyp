import * as adminService from "../services/admin.service.js";
import * as reviewService from "../services/review.service.js";

export const getAdminDoctors = async (req, res) => {
    try {
        const doctors = await adminService.getAdminDoctors();
        return res.status(200).json({ success: true, doctors });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminUsers = async (req, res) => {
    try {
        const users = await adminService.getAdminUsers();
        return res.status(200).json({ success: true, users });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminHospitals = async (req, res) => {
    try {
        const hospitals = await adminService.getAdminHospitals();
        return res.status(200).json({ success: true, hospitals });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminReviews = async (req, res) => {
    try {
        const { scope } = req.query;
        const reviews = await reviewService.getAdminReviews(scope);
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};
export const getAdminDoctorRequests = async (req, res) => {
    try {
        const requests = await adminService.getAdminDoctorRequests();
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminHospitalRequests = async (req, res) => {
    try {
        const requests = await adminService.getAdminHospitalRequests();
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminDoctorRequestById = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await adminService.getAdminDoctorRequestById(requestId);
        return res.status(200).json({ success: true, request });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminHospitalRequestById = async (req, res) => {
    try {
        const { requestId } = req.params;
        const request = await adminService.getAdminHospitalRequestById(requestId);
        return res.status(200).json({ success: true, request });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const getAdminStats = async (req, res) => {
    try {
        const stats = await adminService.getAdminStats();
        return res.status(200).json({ success: true, stats });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const deleteAdminDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await adminService.deleteAdminDoctor(id);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export const deleteAdminHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await adminService.deleteAdminHospital(id);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};
