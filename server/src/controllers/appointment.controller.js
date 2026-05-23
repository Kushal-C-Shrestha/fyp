import * as appointmentService from "../services/appointment.service.js";

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const resolveUrl = (filePath, req) => {
    if (!filePath) return "";
    if (/^https?:\/\//i.test(filePath)) return filePath;
    const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${getBaseUrl(req)}${normalized}`;
};

const bookAppointment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { doctorId, hospitalId, appointmentDate, appointmentTime, appointmentType, reasonForVisit, recordIds, confirmOverlap } = req.body;
        const result = await appointmentService.bookAppointment(userId, doctorId, hospitalId, appointmentDate, appointmentTime, appointmentType, reasonForVisit, !!confirmOverlap);
        
        if (recordIds && Array.isArray(recordIds) && recordIds.length > 0) {
            await appointmentService.attachRecords(result.appointmentId, recordIds);
        }

        res.status(201).json({ success: true, message: "Appointment booked successfully", appointmentId: result.appointmentId });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message, code: error.code || null });
    }
};

const getAppointmentById = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const appointment = await appointmentService.getAppointmentById(appointmentId);
        if (appointment) {
            appointment.doctor_image = resolveUrl(appointment.doctor_image, req);
            appointment.patient_image = resolveUrl(appointment.patient_image, req);
        }
        res.status(200).json({ success: true, appointment });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const completeAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { remarks } = req.body;
        const result = await appointmentService.completeAppointment(id, userId, remarks);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const rescheduleAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        const { newHospitalId, newAppointmentDate, newAppointmentTime } = req.body;
        const result = await appointmentService.rescheduleAppointment(id, userId, role, newHospitalId, newAppointmentDate, newAppointmentTime);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const cancelAppointment = async (req, res) => {
    try {
        const { id } = req.params;
        const { id: userId, role } = req.user;
        const result = await appointmentService.cancelAppointment(id, userId, role);
        res.status(200).json({ success: true, message: result.message });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const getAppointments = async (req, res) => {
    try {
        const { role, id: userId } = req.user;
        const appointments = await appointmentService.getAppointments(role, userId, req.query);
        const resolved = (appointments || []).map(apt => ({
            ...apt,
            doctor_image: resolveUrl(apt.doctor_image, req),
            patient_image: resolveUrl(apt.patient_image, req),
        }));
        res.status(200).json({ success: true, appointments: resolved });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

const attachRecords = async (req, res) => {
    try {
        const { id } = req.params;
        const { records } = req.body;

        if (!records || !Array.isArray(records) || records.length === 0) {
            return res.status(400).json({ success: false, message: "No records provided" });
        }

        const data = await appointmentService.attachRecords(id, records, {
            userId: req.user?.id,
            role: req.user?.role,
            requireAppointmentAccess: true,
        });
        res.status(200).json({ success: true, message: "Records attached successfully", data });
    } catch (error) {
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};

export {
    bookAppointment,
    getAppointmentById,
    completeAppointment,
    rescheduleAppointment,
    cancelAppointment,
    getAppointments,
    attachRecords
};
