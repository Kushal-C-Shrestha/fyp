import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
    bookAppointment,
    getAppointmentById,
    getAppointments,
    cancelAppointment,
    rescheduleAppointment,
} from "../../services/appointment.service.js";

const bookAppointmentTool = new DynamicStructuredTool({
    name: "book_appointment",
    description: `
        Book an appointment for a patient with a doctor at a hospital.
        Use this when the user wants to schedule an appointment.
        Requires patient ID, doctor ID, hospital ID, date (YYYY-MM-DD), time (HH:MM), type (online/physical), and reason.
        Returns the new appointment ID on success.
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { val = JSON.parse(val); } catch (e) { return val; }
        }
        if (val && typeof val === 'object') {
            // Accept 'mode' as alias for 'type' (model sometimes uses 'mode')
            if (!val.type && val.mode) val.type = val.mode;
            // Default type to 'physical' if missing
            if (!val.type) val.type = 'physical';
        }
        return val;
    }, z.object({
        patient_id: z.coerce.string().describe("The ID of the patient booking the appointment"),
        doctor_id: z.coerce.string().describe("The ID of the doctor"),
        hospital_id: z.coerce.string().describe("The ID of the hospital"),
        date: z.string().describe("Appointment date in YYYY-MM-DD format"),
        time: z.string().describe("Appointment time in HH:MM format (24-hour)"),
        type: z.enum(["online", "physical"]).describe("Type of appointment: online or physical"),
        reason: z.string().optional().describe("Reason for the visit"),
    })),
    func: async ({ patient_id, doctor_id, hospital_id, date, time, type, reason }) => {
        try {
            // Normalize time: convert "11:00 AM" / "2:30 PM" to 24-hour "HH:MM" format
            let normalizedTime = time;
            const ampmMatch = time && time.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
            if (ampmMatch) {
                let hours = parseInt(ampmMatch[1], 10);
                const minutes = ampmMatch[2];
                const period = ampmMatch[3].toUpperCase();
                if (period === "AM" && hours === 12) hours = 0;
                else if (period === "PM" && hours !== 12) hours += 12;
                normalizedTime = `${String(hours).padStart(2, '0')}:${minutes}`;
            }
            const result = await bookAppointment(patient_id, doctor_id, hospital_id, date, normalizedTime, type, reason);
            return `Appointment booked successfully! Appointment ID: ${result.appointmentId}. Date: ${date} at ${normalizedTime} with Doctor ID ${doctor_id} at Hospital ID ${hospital_id}.`;
        } catch (error) {
            if (error.code === "PATIENT_OVERLAP") {
                return `You already have another appointment at this time. Would you like to book anyway? If so, confirm and I will proceed.`;
            }
            return `Error booking appointment: ${error.message}`;
        }
    },
});

const getAppointmentTool = new DynamicStructuredTool({
    name: "get_appointment",
    description: "Get details of a specific appointment by its ID.",
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        appointment_id: z.coerce.string().describe("The ID of the appointment"),
    })),
    func: async ({ appointment_id }) => {
        try {
            const a = await getAppointmentById(appointment_id);
            return `Appointment #${a.id}: Date: ${a.date}, Time: ${a.time}, Status: ${a.status}, Doctor: ${a.doctor.name} (${a.doctor.specialization}), Hospital: ${a.hospital.name}, Patient: ${a.patient.name}, Reason: ${a.reason || "N/A"}`;
        } catch (error) {
            return `Error fetching appointment: ${error.message}`;
        }
    },
});

const listAppointmentsTool = new DynamicStructuredTool({
    name: "list_appointments",
    description: `
        List appointments for a user (patient or doctor).
        Use this when the user wants to see their appointments.
        Can filter by status (scheduled, completed, cancelled), mode (online/physical), date range, or upcoming only.
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        user_id: z.coerce.string().describe("The ID of the user whose appointments to fetch"),
        role: z.enum(["patient", "doctor"]).describe("The role of the user: patient or doctor"),
        status: z.string().optional().describe("Comma-separated statuses to filter: scheduled, completed, cancelled"),
        mode: z.string().optional().describe("Filter by mode: online or physical"),
        from_date: z.string().optional().describe("Start date filter in YYYY-MM-DD format"),
        to_date: z.string().optional().describe("End date filter in YYYY-MM-DD format"),
        upcoming: z.boolean().optional().describe("If true, return only upcoming scheduled appointments"),
    })),
    func: async ({ user_id, role, status, mode, from_date, to_date, upcoming }) => {
        try {
            const effectiveRole = role || "patient"; // default to patient if not specified
            const query = {
                status,
                mode,
                fromDate: from_date,
                toDate: to_date,
                upcoming: upcoming ? "true" : undefined,
            };
            const results = await getAppointments(effectiveRole, user_id, query);

            if (!results || results.length === 0) {
                return "No appointments found matching your criteria.";
            }

            return results.slice(0, 10).map(a =>
                `#${a.appointment_id}: ${a.appointment_date} at ${a.appointment_time} — ${a.appointment_status} — Dr. ${a.doctor_name} (${a.specialization_name}) — ${a.hospital_name}`
            ).join("\n");
        } catch (error) {
            return `Error fetching appointments: ${error.message}`;
        }
    },
});

const cancelAppointmentTool = new DynamicStructuredTool({
    name: "cancel_appointment",
    description: `
        Cancel an existing appointment. The user must cancel at least 1 hour before the appointment time.
        Use this when the user wants to cancel an appointment they have booked.
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        appointment_id: z.coerce.string().describe("The ID of the appointment to cancel"),
        user_id: z.coerce.string().describe("The ID of the user requesting cancellation (patient or doctor)"),
    })),
    func: async ({ appointment_id, user_id }) => {
        try {
            const result = await cancelAppointment(appointment_id, user_id);
            return result.message;
        } catch (error) {
            return `Error cancelling appointment: ${error.message}`;
        }
    },
});

const rescheduleAppointmentTool = new DynamicStructuredTool({
    name: "reschedule_appointment",
    description: `
        Reschedule an existing appointment to a new date, time, or hospital.
        Use this when the user wants to change the date or time of an existing appointment.
    `,
    schema: z.preprocess((val) => {
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch (e) { return val; }
        }
        return val;
    }, z.object({
        appointment_id: z.coerce.string().describe("The ID of the appointment to reschedule"),
        user_id: z.coerce.string().describe("The ID of the user requesting the reschedule (patient or doctor)"),
        hospital_id: z.coerce.string().describe("The hospital ID for the rescheduled appointment"),
        date: z.string().describe("New appointment date in YYYY-MM-DD format"),
        time: z.string().describe("New appointment time in HH:MM format (24-hour)"),
    })),
    func: async ({ appointment_id, user_id, hospital_id, date, time }) => {
        try {
            // null for userRole — chatbot users are patients/doctors, ownership check is sufficient
            const result = await rescheduleAppointment(appointment_id, user_id, null, hospital_id, date, time);
            return result.message;
        } catch (error) {
            return `Error rescheduling appointment: ${error.message}`;
        }
    },
});

export const appointmentTools = [
    bookAppointmentTool,
    getAppointmentTool,
    listAppointmentsTool,
    cancelAppointmentTool,
    rescheduleAppointmentTool,
];
