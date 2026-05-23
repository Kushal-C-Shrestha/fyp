import * as doctorService from "../services/doctor.service.js";
import * as doctorRequestService from "../services/doctorHospitalRequest.service.js";

const getAllDoctors = async (req, res) => {
    try {
        let doctors = await doctorService.searchDoctors({
            q: req.query.query,
            gender: req.query.gender,
            specializationId: req.query.specializationId,
            hospitalId: req.query.hospitalId,
            sort: req.query.sort,
            order: req.query.order,
            exclude: req.query.exclude
        });

        const requestedPage = Math.max(parseInt(req.query.page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 50);
        const totalPages = Math.max(1, Math.ceil(doctors.length / limitNum));
        const pageNum = Math.min(requestedPage, totalPages);

        const startIndex = (pageNum - 1) * limitNum;
        const endIndex = startIndex + limitNum;

        const paginatedDoctors = doctors.slice(startIndex, endIndex);

        const resolvedDoctors = paginatedDoctors.map((doc) => ({
            ...doc,
            profilePicture: resolveUrl(doc.profilePicture, req),
        }));

        return res.status(200).json({
            success: true,
            doctors: resolvedDoctors,
            pagination: {
                totalItems: doctors.length,
                totalPages,
                currentPage: pageNum,
                limit: limitNum
            }
        });
    } catch (error) {
        console.error("Error fetching doctors:", error);
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getDoctorById = async (req, res) => {
    try {
        const doctorId = req.params.id;
        if (!doctorId || isNaN(doctorId)) {
            return res.status(400).json({ success: false, message: "Invalid doctor ID" });
        }
        const result = await doctorService.getDoctorById(doctorId);
        if (result?.doctor) {
            result.doctor.profile_picture = resolveUrl(result.doctor.profile_picture, req);
            if (Array.isArray(result.doctor.reviews)) {
                result.doctor.reviews.forEach((review) => {
                    if (review.reviewer_picture) {
                        review.reviewer_picture = resolveUrl(review.reviewer_picture, req);
                    }
                });
            }
        }
        return res.status(200).json({ success: true, doctor: result.doctor });
    } catch (error) {
        console.error("Error fetching doctor by ID:", error);
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getAvailableSlotsForDoctor = async (req, res) => {
    try {
        const { id } = req.params;
        const { date } = req.query;
        if (!id || isNaN(id)) {
            return res.status(400).json({ success: false, message: "Invalid doctor ID" });
        }
        const slots = await doctorService.generateAvailableSlots(id, date);
        
        // Extract assignments and recurring schedules for frontend compatibility
        const { doctor } = await doctorService.getDoctorById(id);
        const assignments = [];
        const recurringSchedule = [];
        if (doctor && Array.isArray(doctor.hospitals)) {
            doctor.hospitals.forEach(h => {
                if (Array.isArray(h.schedule) && h.schedule.length > 0) {
                    assignments.push({
                        assignment_id: h.schedule[0].assignment_id,
                        hospital_id: h.hospital_id,
                        hospital_name: h.hospital_name,
                        department_name: "General",
                        assignment_status: "Active"
                    });
                    h.schedule.forEach(s => {
                        recurringSchedule.push({
                            assignment_id: s.assignment_id,
                            hospital_name: h.hospital_name,
                            department_name: "General",
                            assignment_status: "Active",
                            day_of_week: s.day_of_week,
                            start_time: s.start_time,
                            end_time: s.end_time,
                            slot_interval_minutes: s.slot_interval_minutes
                        });
                    });
                }
            });
        }
        
        return res.status(200).json({ success: true, slots, assignments, recurringSchedule });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
}

const getDoctorFromSingleHospital = async (req, res) => {
    try {
        const { id } = req.params;
        const doctors = await doctorService.getDoctorFromSingleHospital(id);
        return res.status(200).json({ success: true, doctors });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getDoctorAssignmentRequests = async (req, res) => {
    try {
        const requests = await doctorRequestService.getDoctorAssignmentRequests({ doctorId: req.params.id });
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const createDoctorAssignmentRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await doctorRequestService.createDoctorAssignmentRequest({
            doctorId: id,
            hospitalId: req.body.hospital_id,
            requesterId: req.user.id || req.user.user_id,
            consultationFee: req.body.consultation_fee,
            requestMessage: req.body.request_message,
            requestedSchedule: req.body.requested_schedule
        });
        
        // Refresh requests automatically to mimic previous logic
        const requests = await doctorRequestService.getDoctorAssignmentRequests({ doctorId: id });
        return res.status(201).json({ success: true, message: "Assignment request submitted successfully.", requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const reviewDoctorAssignmentRequestByDoctor = async (req, res) => {
    try {
        const { requestId } = req.params;
        const result = await doctorRequestService.reviewDoctorAssignmentRequestByDoctor({
            requestId,
            doctorId: req.user.id || req.user.user_id,
            decision: req.body.status
        });
        return res.status(200).json({ success: true, message: "Assignment request reviewed successfully.", result });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getDoctorLeaveRequests = async (req, res) => {
    try {
        const requests = await doctorRequestService.getDoctorLeaveRequests({ doctorId: req.params.id });
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const createDoctorLeaveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        await doctorRequestService.createDoctorLeaveRequest({
            doctorId: id,
            requesterId: req.user?.id ?? req.user?.user_id,
            assignmentId: req.body.assignment_id,
            leaveType: req.body.leave_type,
            startDate: req.body.start_date,
            endDate: req.body.end_date,
            startTime: req.body.start_time,
            endTime: req.body.end_time,
            reason: req.body.reason
        });
        
        const requests = await doctorRequestService.getDoctorLeaveRequests({ doctorId: id });
        return res.status(201).json({ success: true, message: "Leave request submitted successfully.", requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const deleteDoctorLeaveRequest = async (req, res) => {
    try {
        const { id, leaveId } = req.params;
        await doctorRequestService.deleteDoctorLeaveRequest({
            leaveId,
            doctorId: id,
            requesterId: req.user?.id ?? req.user?.user_id
        });
        
        const requests = await doctorRequestService.getDoctorLeaveRequests({ doctorId: id });
        return res.status(200).json({ success: true, message: "Leave request removed successfully.", requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const createDoctorScheduleChangeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await doctorRequestService.createDoctorScheduleChangeRequest({
            doctorId: id,
            requesterId: req.user?.id ?? req.user?.user_id,
            assignmentId: req.body.assignment_id,
            reason: req.body.reason,
            recurringSchedule: req.body.recurringSchedule ?? req.body.requested_schedule ?? []
        });
        return res.status(201).json({ success: true, message: "Schedule change request submitted successfully.", result });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const registerDoctorRequest = async (req, res) => {
    try {
        const result = await doctorService.registerDoctorRequest({ body: req.body, files: req.files });
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const verifyDoctorRequest = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;
        const user = req.user;
        const result = await doctorService.verifyDoctorRequest(requestId, status, user);
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const searchDoctors = async (req, res) => {
    try {
        const { query, gender, specializationId, hospitalId, sort, order, exclude } = req.query;
        const doctors = await doctorService.searchDoctors({
            q: query?.trim() || null,
            gender: gender?.trim() || null,
            specializationId: specializationId ? Number(specializationId) : null,
            hospitalId: hospitalId ? Number(hospitalId) : null,
            sort: sort ? sort.trim() : null,
            order: order ? order.trim() : null,
            exclude: exclude ? Number(exclude) : null
        });
        return res.status(200).json({
            success: true,
            doctors,
        });
    } catch (error) {
        return res.status(error.status || 500).json({
            success: false,
            message: error.message || "An error occurred while searching for doctors.",
        });
    }
};

const getDoctorAssignments = async (req, res) => {
    try {
        const assignments = await doctorRequestService.getDoctorAssignments({ doctorId: req.params.id });
        return res.status(200).json({ success: true, assignments });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const removeDoctorHospitalAssignment = async (req, res) => {
    try {
        const { id, assignmentId } = req.params;
        const assignments = await doctorRequestService.removeDoctorHospitalAssignment({
            doctorId: id,
            requesterId: req.user?.id ?? req.user?.user_id,
            assignmentId,
        });
        return res.status(200).json({ success: true, message: "Affiliation removed.", assignments });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const resolveUrl = (filePath, req) => {
    if (!filePath) return "";
    if (/^https?:\/\//i.test(filePath)) return filePath;
    const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${getBaseUrl(req)}${normalized}`;
};

const getDoctorSettings = async (req, res) => {
    try {
        const doctorId = req.user.id || req.user.user_id;
        const settings = await doctorService.getDoctorSettings(doctorId);
        if (settings?.account?.profile_picture) {
            settings.account.profile_picture = resolveUrl(settings.account.profile_picture, req);
        }
        return res.status(200).json({ success: true, settings });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const updateDoctorSettings = async (req, res) => {
    try {
        const doctorId = req.user.id || req.user.user_id;
        const result = await doctorService.updateDoctorSettings(doctorId, req.body);
        
        // Also fetch updated settings so we can return them resolved
        const settings = await doctorService.getDoctorSettings(doctorId);
        if (settings?.account?.profile_picture) {
            settings.account.profile_picture = resolveUrl(settings.account.profile_picture, req);
        }
        
        return res.status(200).json({ success: true, ...result, settings });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export {
    getAllDoctors,
    getDoctorById,
    getAvailableSlotsForDoctor,
    getDoctorFromSingleHospital,
    registerDoctorRequest,
    verifyDoctorRequest,
    searchDoctors,
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
};
