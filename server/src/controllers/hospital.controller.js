import * as hospitalService from "../services/hospital.service.js";
import * as doctorHospitalRequestService from "../services/doctorHospitalRequest.service.js";
import pool from "../config/db.js";
import { bustCache } from "../middlewares/cache.middleware.js";
import fs from "fs";
import path from "path";

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const resolveUrl = (filePath, req) => {
  if (!filePath) return "";
  if (/^https?:\/\//i.test(filePath)) return filePath;
  const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
  return `${getBaseUrl(req)}${normalized}`;
};

const deleteFile = async (filePath) => {
  if (!filePath) return;
  let cleanPath = filePath;
  if (/^https?:\/\//i.test(cleanPath)) {
    try {
      const url = new URL(cleanPath);
      cleanPath = url.pathname;
    } catch {
      return;
    }
  }
  cleanPath = cleanPath.replace(/^\/+/, "");
  if (!cleanPath.startsWith("uploads/")) return;

  const absPath = path.resolve(process.cwd(), cleanPath);
  try {
    if (fs.existsSync(absPath)) {
      await fs.promises.unlink(absPath);
    }
  } catch (err) {
    console.error(`Failed to delete file on disk: ${absPath}`, err);
  }
};

const getAllHospitals = async (req, res) => {
    try {
        const hospitals = await hospitalService.getAllHospitals();
        hospitals.forEach(h => {
            if (h.hospital_image) h.hospital_image = resolveUrl(h.hospital_image, req);
        });
        return res.status(200).json({ success: true, hospitals });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const searchHospitals = async (req, res) => {
    try {
        const hospitals = await hospitalService.searchHospitals({
            query: req.query?.query,
            typesArray: req.query?.types ? String(req.query.types).split(",") : [],
            departmentsArray: req.query?.departments ? String(req.query.departments).split(",") : [],
            facilityIdsArray: req.query?.facilityIds ? String(req.query.facilityIds).split(",") : [],
            sort: req.query?.sort,
            order: req.query?.order,
        });
        hospitals.forEach(h => {
            if (h.hospital_image) h.hospital_image = resolveUrl(h.hospital_image, req);
        });
        return res.status(200).json({ success: true, hospitals });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalById = async (req, res) => {
    try {
        const { id } = req.params;
        const hospital = await hospitalService.getHospitalById(id);
        if (hospital?.hospital_image) {
            hospital.hospital_image = resolveUrl(hospital.hospital_image, req);
        }
        return res.status(200).json({ success: true, hospital });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getMyHospitalContext = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const hospital = await hospitalService.getMyHospitalContext({ userId });
        if (hospital?.hospital_image) {
            hospital.hospital_image = resolveUrl(hospital.hospital_image, req);
        }
        return res.status(200).json({ success: true, hospital });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const registerHospitalRequest = async (req, res) => {
    try {
        const result = await hospitalService.registerHospitalRequest({ body: req.body, files: req.files });
        return res.status(201).json({ success: true, message: result.message, requestId: result.requestId });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const verifyHospitalRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { verify, notes, adminNotes, rejectionNote, reason } = req.body;
        const note = notes || adminNotes || rejectionNote || reason || null;
        const result = await hospitalService.verifyHospitalRequest(id, verify, note);
        if (String(verify || "").trim().toLowerCase() === "approved") {
            await bustCache("hospitals");
        }
        return res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalRequests = async (_req, res) => {
    try {
        const requests = await hospitalService.getHospitalRequests();
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalDoctorAssignmentRequests = async (req, res) => {
    try {
        const requesterId = req.user?.id ?? req.user?.user_id;
        const requesterRole = req.user?.role ?? req.user?.user_role ?? "";
        const requests = await doctorHospitalRequestService.getHospitalDoctorAssignmentRequests({
            requesterId,
            requesterRole,
            includeNonPending: true,
        });
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const createHospitalDoctorAssignmentRequest = async (req, res) => {
    try {
        const requesterId = req.user?.id ?? req.user?.user_id;
        const requesterRole = req.user?.role ?? req.user?.user_role ?? "";
        const result = await doctorHospitalRequestService.createHospitalDoctorAssignmentRequest({
            requesterId,
            requesterRole,
            hospitalId: req.body?.hospital_id ?? req.body?.hospitalId,
            doctorId: req.body?.doctor_id ?? req.body?.doctorId,
            consultationFee: req.body?.consultation_fee ?? req.body?.consultationFee,
            requestMessage: req.body?.request_message ?? req.body?.requestMessage,
            requestedSchedule: req.body?.requested_schedule ?? req.body?.requestedSchedule ?? [],
        });
        return res.status(201).json({ success: true, message: "Doctor affiliation request submitted.", ...result });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const reviewDoctorAssignmentRequest = async (req, res) => {
    try {
        const reviewerId = req.user?.id ?? req.user?.user_id;
        const reviewerRole = req.user?.role ?? req.user?.user_role ?? "";
        const result = await doctorHospitalRequestService.reviewDoctorAssignmentRequest({
            requestId: req.params.requestId,
            reviewerId,
            reviewerRole,
            decision: req.body?.status,
            adminNotes: req.body?.admin_notes ?? req.body?.adminNotes ?? req.body?.notes,
        });
        return res.status(200).json({ success: true, message: "Doctor affiliation request updated.", ...result });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalScheduleRequests = async (req, res) => {
    try {
        const requesterId = req.user?.id ?? req.user?.user_id;
        const requesterRole = req.user?.role ?? req.user?.user_role ?? "";
        const requests = await doctorHospitalRequestService.getHospitalScheduleRequests({
            requesterId,
            requesterRole,
            includeNonPending: true,
        });
        return res.status(200).json({ success: true, requests });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const reviewHospitalScheduleRequest = async (req, res) => {
    try {
        const reviewerId = req.user?.id ?? req.user?.user_id;
        const reviewerRole = req.user?.role ?? req.user?.user_role ?? "";
        const result = await doctorHospitalRequestService.reviewHospitalScheduleRequest({
            requestId: req.params.requestId,
            reviewerId,
            reviewerRole,
            requestType: req.body?.request_type ?? req.body?.requestType,
            decision: req.body?.status,
        });
        return res.status(200).json({ success: true, message: "Schedule request updated.", ...result });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalPatients = async (_req, res) => {
    try {
        const patients = await hospitalService.getHospitalPatients();
        return res.status(200).json({ success: true, patients });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const createHospitalAppointment = async (req, res) => {
    try {
        const adminUserId = req.user?.id ?? req.user?.user_id;
        const { patientEmail, patientId, doctorId, date, time, type, reason } = req.body;
        const result = await hospitalService.createHospitalAppointment({
            adminUserId,
            patientEmail,
            patientId,
            doctorId,
            date,
            time,
            type,
            reason,
        });
        return res.status(201).json({ success: true, message: "Appointment created successfully.", appointmentId: result.appointmentId });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getHospitalDashboardStats = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const hospital = await hospitalService.getMyHospitalContext({ userId });
        const stats = await hospitalService.getHospitalDashboardStats({ hospitalId: hospital.hospital_id });
        return res.status(200).json({ success: true, stats });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const updateMyHospital = async (req, res) => {
  try {
    const userId = req.user?.id ?? req.user?.user_id;
    const { rows: adminRows } = await pool.query(
      "SELECT hospital_id FROM hospital_admin WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (adminRows.length === 0) {
      return res.status(403).json({ message: "You are not authorized or do not manage a hospital." });
    }

    const hospitalId = adminRows[0].hospital_id;
    const result = await hospitalService.updateHospitalDetails(hospitalId, req.body);
    
    const hospital = await hospitalService.getMyHospitalContext({ userId });
    if (hospital?.hospital_image) {
      hospital.hospital_image = resolveUrl(hospital.hospital_image, req);
    }

    return res.status(200).json({ success: true, ...result, hospital });
  } catch (error) {
    console.error("Error in updateMyHospital:", error);
    return res.status(error.status || 500).json({ success: false, message: error.message || "Failed to update hospital." });
  }
};

const uploadHospitalLogo = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded." });
    }

    const { rows: adminRows } = await pool.query(
      "SELECT hospital_id FROM hospital_admin WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (adminRows.length === 0) {
      return res.status(403).json({ message: "You are not authorized or do not manage a hospital." });
    }

    const hospitalId = adminRows[0].hospital_id;

    const { rows } = await pool.query("SELECT profile_picture FROM hospitals WHERE id = $1 LIMIT 1", [hospitalId]);
    const oldPic = rows[0]?.profile_picture;

    const relativePath = `uploads/hospitals/${req.file.filename}`;

    await pool.query("UPDATE hospitals SET profile_picture = $1 WHERE id = $2", [relativePath, hospitalId]);

    if (oldPic) {
      await deleteFile(oldPic);
    }

    const resolvedUrl = resolveUrl(relativePath, req);
    res.json({
      success: true,
      message: "Hospital logo uploaded successfully.",
      profile_picture: resolvedUrl,
    });
  } catch (error) {
    console.error("Error in uploadHospitalLogo:", error);
    res.status(500).json({ message: error.message || "Failed to upload logo." });
  }
};

const deleteHospitalLogo = async (req, res) => {
  try {
    const userId = req.user.id || req.user.user_id;

    const { rows: adminRows } = await pool.query(
      "SELECT hospital_id FROM hospital_admin WHERE user_id = $1 LIMIT 1",
      [userId]
    );

    if (adminRows.length === 0) {
      return res.status(403).json({ message: "You are not authorized or do not manage a hospital." });
    }

    const hospitalId = adminRows[0].hospital_id;

    const { rows } = await pool.query("SELECT profile_picture FROM hospitals WHERE id = $1 LIMIT 1", [hospitalId]);
    const oldPic = rows[0]?.profile_picture;

    if (!oldPic) {
      return res.json({ success: true, message: "No hospital logo to remove." });
    }

    await pool.query("UPDATE hospitals SET profile_picture = NULL WHERE id = $1", [hospitalId]);

    await deleteFile(oldPic);

    res.json({
      success: true,
      message: "Hospital logo removed successfully.",
    });
  } catch (error) {
    console.error("Error in deleteHospitalLogo:", error);
    res.status(500).json({ message: error.message || "Failed to remove logo." });
  }
};

export {
    getAllHospitals,
    searchHospitals,
    getHospitalById,
    getMyHospitalContext,
    registerHospitalRequest,
    verifyHospitalRequest,
    getHospitalRequests,
    getHospitalDoctorAssignmentRequests,
    createHospitalDoctorAssignmentRequest,
    reviewDoctorAssignmentRequest,
    getHospitalScheduleRequests,
    reviewHospitalScheduleRequest,
    getHospitalPatients,
    createHospitalAppointment,
    getHospitalDashboardStats,
    updateMyHospital,
    uploadHospitalLogo,
    deleteHospitalLogo,
};
