import pool from "../config/db.js";
import { normalizeDateOnly, normalizeTimeOnly, isSlotPast, timeToMinutes } from "./schedule.shared.js";
import { createNotification } from "./notification.service.js";
import { parsePositiveInt } from "../utils/helpers.js";

const err = (msg, status = 400) => {
    const error = new Error(msg);
    error.status = status;
    throw error;
};

const toInt = (val, msg = "Invalid ID") => parsePositiveInt(val, msg);

const normalizeType = (v) =>
    /online|video|virtual/i.test(v) ? "online" : "physical";

const mapRow = (r) => ({
    ...r,
    appointment_type: normalizeType(r.appointment_type),
    appointment_status: r.appointment_status?.toLowerCase(),
    doctor_notes: r.notes?.trim() || null,
    attached_records: r.attached_records || [],
});

const getBaseQuery = (where) => `
    SELECT
      a.id AS appointment_id, a.patient_id, a.doctor_id, a.hospital_id,
      a.appointment_type, a.status::text AS appointment_status,
      a.reason_for_visit AS appointment_reason, a.notes,
      a.appointment_date::text AS appointment_date,
      a.appointment_time::text AS appointment_time,
      a.created_at, a.updated_at,
      doctor.full_name AS doctor_name, doctor.profile_picture AS doctor_image,
      patient.full_name AS patient_name, patient.profile_picture AS patient_image,
      patient.email AS patient_email, patient.phone AS patient_phone,
      hospital.full_name AS hospital_name,
      COALESCE(spec.specialization_name, 'General Medicine') AS specialization_name,
      COALESCE(records.attached_records, '[]'::json) AS attached_records,
      COALESCE(records.attached_reports, ARRAY[]::text[]) AS attached_reports,
      COALESCE(dha.fee, 0.00) AS consultation_fee
    FROM appointments a
    JOIN users doctor ON doctor.id = a.doctor_id
    JOIN users patient ON patient.id = a.patient_id
    LEFT JOIN hospitals hospital ON hospital.id = a.hospital_id
    LEFT JOIN doctor_hospital_assignments dha ON dha.doctor_id = a.doctor_id AND dha.hospital_id = a.hospital_id
    LEFT JOIN LATERAL (
        SELECT STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) AS specialization_name
        FROM doctor_specializations ds
        JOIN specializations s ON s.id = ds.specialization_id
        WHERE ds.doctor_id = a.doctor_id
    ) spec ON TRUE
    LEFT JOIN LATERAL (
        SELECT
          COALESCE(JSON_AGG(JSON_BUILD_OBJECT('record_id', mr.id, 'record_name', mr.name, 'record_view_path', '/records/view/' || mr.id::text)) FILTER (WHERE mr.id IS NOT NULL), '[]'::json) AS attached_records,
          COALESCE(ARRAY_AGG(mr.name) FILTER (WHERE mr.name IS NOT NULL), ARRAY[]::text[]) AS attached_reports
        FROM appointment_records ar
        JOIN medical_records mr ON mr.id = ar.record_id
        WHERE ar.appointment_id = a.id
    ) records ON TRUE
    WHERE ${where}
`;


const checkOverlap = async (client, patientId, doctorId, hospitalId, date, time, excludeId) => {
    const exclude = excludeId ? toInt(excludeId) : null;
    const excludeClause = exclude ? 'AND id<>$4::int' : '';

    const { rows: patientRows } = await client.query(
        `SELECT id FROM appointments
         WHERE patient_id=$1 AND appointment_date=$2::date AND appointment_time=$3::time
           AND LOWER(status::text) NOT IN ('cancelled', 'completed')
           ${excludeClause}
         LIMIT 1`,
        exclude ? [patientId, date, time, exclude] : [patientId, date, time]
    );
    if (patientRows.length) {
        const e = new Error("The patient already has another appointment at this time.");
        e.status = 409;
        e.code = 'PATIENT_OVERLAP';
        throw e;
    }

    const { rows: sameDayDoctorRows } = await client.query(
        `SELECT id FROM appointments
         WHERE patient_id=$1 AND doctor_id=$2 AND appointment_date=$3::date
           AND LOWER(status::text) NOT IN ('cancelled', 'completed')
           ${exclude ? 'AND id<>$4::int' : ''}
         LIMIT 1`,
        exclude ? [patientId, doctorId, date, exclude] : [patientId, doctorId, date]
    );
    if (sameDayDoctorRows.length) {
        err("The patient already has an appointment today.", 409);
    }

    // Compare appointment time ranges using each hospital assignment's slot duration.
    const { rows: existingAppts } = await client.query(
        `SELECT a.appointment_time, aa.slot_interval_minutes
         FROM appointments a
         JOIN assignment_availability aa ON aa.assignment_id = (
             SELECT id FROM doctor_hospital_assignments 
             WHERE doctor_id = a.doctor_id AND hospital_id = a.hospital_id
             LIMIT 1
         ) AND TRIM(aa.day_of_week) = TRIM(to_char(a.appointment_date, 'Day'))
         WHERE a.doctor_id = $1 AND a.appointment_date = $2::date
           AND LOWER(a.status::text) NOT IN ('cancelled', 'completed')
           ${exclude ? 'AND a.id<>$3::int' : ''}`,
        exclude ? [doctorId, date, exclude] : [doctorId, date]
    );

    const newStart = toMins(time);

    const { rows: currentSched } = await client.query(
        `SELECT aa.slot_interval_minutes 
         FROM assignment_availability aa
         JOIN doctor_hospital_assignments dha ON dha.id = aa.assignment_id
         WHERE dha.doctor_id = $1 AND dha.hospital_id = $2
           AND TRIM(aa.day_of_week) = TRIM(to_char($3::date, 'Day'))
         LIMIT 1`,
        [doctorId, hospitalId, date]
    );
    const newInterval = parseInt(currentSched[0]?.slot_interval_minutes, 10) || 30;
    const newEnd = newStart + newInterval;

    for (const appt of existingAppts) {
        const apptStart = toMins(appt.appointment_time);
        const interval = parseInt(appt.slot_interval_minutes, 10) || 30;
        const apptEnd = apptStart + interval;

        const overlapsA = (newStart >= apptStart && newStart < apptEnd);
        const overlapsB = (apptStart >= newStart && apptStart < newEnd);

        if (overlapsA || overlapsB) {
            err("This doctor is busy with another appointment during this time range.", 409);
        }
    }
};

const checkDoctorLeave = async (client, doctorId, hospitalId, date, time) => {
    const { rows } = await client.query(
        `SELECT lr.id, lr.leave_type, lr.start_time, lr.end_time FROM leave_requests lr
         JOIN doctor_hospital_assignments dha ON dha.id = lr.assignment_id
         WHERE dha.doctor_id=$1 AND dha.hospital_id=$2
           AND lr.status='approved'
           AND $3::date >= lr.start_date AND $3::date <= lr.end_date
         LIMIT 1`,
        [doctorId, hospitalId, date]
    );

    if (rows.length > 0) {
        const leave = rows[0];
        if (leave.leave_type === 'full_day') {
            err("Doctor is on leave for the entire day.", 409);
        } else {
            const slotMins = toMins(time);
            const startMins = toMins(leave.start_time);
            const endMins = toMins(leave.end_time);
            if (slotMins >= startMins && slotMins < endMins) {
                err("Doctor is on leave during this time slot.", 409);
            }
        }
    }
};

const checkDoctorAvailability = async (client, doctorId, hospitalId, date, time, excludeId = null) => {
    const { rows } = await client.query(
        `SELECT aa.start_time, aa.end_time, aa.slot_interval_minutes 
         FROM assignment_availability aa
         JOIN doctor_hospital_assignments dha ON dha.id = aa.assignment_id
         WHERE dha.doctor_id = $1 AND dha.hospital_id = $2
           AND TRIM(aa.day_of_week) = TRIM(to_char($3::date, 'Day'))
         LIMIT 1`,
        [doctorId, hospitalId, date]
    );

    if (rows.length === 0) {
        err("Doctor does not work at this hospital on this day.", 400);
    }

    const sched = rows[0];
    const slotMins = toMins(time);
    const startMins = toMins(sched.start_time);
    const endMins = toMins(sched.end_time);

    if (slotMins < startMins || slotMins >= endMins) {
        err("Selected time is outside the doctor's working hours for this hospital.", 400);
    }

    const interval = parseInt(sched.slot_interval_minutes, 10) || 30;
    if ((slotMins - startMins) % interval !== 0) {
        err("Selected time does not align with the doctor's appointment slots.", 400);
    }

    // Catch cases where this slot would run into the next appointment.
    const { rows: laterAppts } = await client.query(
        `SELECT a.appointment_time
         FROM appointments a
         WHERE a.doctor_id = $1 AND a.appointment_date = $2::date
           AND a.appointment_time > $3::time
           AND LOWER(a.status::text) NOT IN ('cancelled', 'completed')
           ${excludeId ? 'AND a.id <> $4::int' : ''}
         ORDER BY a.appointment_time ASC LIMIT 1`,
        excludeId ? [doctorId, date, time, excludeId] : [doctorId, date, time]
    );

    if (laterAppts.length > 0) {
        const laterStart = toMins(laterAppts[0].appointment_time);
        if (slotMins + interval > laterStart) {
            err("This slot would overlap with another existing appointment.", 409);
        }
    }
};

const toMins = (t) => timeToMinutes(t);

export const bookAppointment = async (pId, dId, hId, date, time, type, reason, confirmOverlap = false) => {
    if (isSlotPast(date, time)) err("Cannot book an appointment for a past date and time.", 400);
    const ids = [pId, dId, hId].map(id => toInt(id, "Invalid booking IDs"));
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Validate schedule, leave, and slot conflicts before saving.
        await checkDoctorAvailability(client, ids[1], ids[2], date, time);
        await checkDoctorLeave(client, ids[1], ids[2], date, time);
        if (!confirmOverlap) {
            await checkOverlap(client, ids[0], ids[1], ids[2], date, time);
        }

        if (confirmOverlap) {
            const { rows: doctorRows } = await client.query(
                `SELECT id FROM appointments
                 WHERE doctor_id=$1 AND appointment_date=$2::date AND appointment_time=$3::time
                   AND LOWER(status::text) NOT IN ('cancelled', 'completed')
                 LIMIT 1`,
                [ids[1], date, time]
            );
            if (doctorRows.length) err("This time slot has already been booked. Please choose another.", 409);
        }
        const { rows } = await client.query(
            `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_type, appointment_date, appointment_time, status, reason_for_visit)
             VALUES ($1, $2, $3, $4::appointment_type_enum, $5::date, $6::time, 'scheduled'::appointment_status_enum, $7) RETURNING id`,
            [...ids, normalizeType(type), date, time, reason?.trim() || "General consultation"]
        );
        await client.query("COMMIT");

        const appt = await getAppointmentById(rows[0].id);
        const dateStr = normalizeDateOnly(appt.date);
        const timeStr = appt.time;

        await Promise.all([
            createNotification({
                userId: ids[0],
                type: "appointment_booked",
                title: "New Appointment Booked",
                message: `Your appointment with Dr. ${appt.doctor.name} is scheduled for ${dateStr} at ${timeStr}.`,
                metadata: { appointment_id: rows[0].id }
            }),
            createNotification({
                userId: ids[1],
                type: "appointment_booked",
                title: "New Appointment Request",
                message: `Patient ${appt.patient.name} has booked an appointment for ${dateStr} at ${timeStr}.`,
                metadata: { appointment_id: rows[0].id }
            })
        ]);

        return { appointmentId: rows[0].id };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally { client.release(); }
};

export const getAppointmentById = async (id) => {
    const { rows } = await pool.query(`${getBaseQuery("a.id = $1")}`, [toInt(id)]);
    if (!rows[0]) err("Appointment not found", 404);
    const a = mapRow(rows[0]);
    return {
        id: a.appointment_id, date: a.appointment_date, time: a.appointment_time, status: a.appointment_status,
        reason: a.appointment_reason, notes: a.doctor_notes,
        doctor: { id: a.doctor_id, name: a.doctor_name, image: a.doctor_image, specialization: a.specialization_name },
        hospital: { id: a.hospital_id, name: a.hospital_name, location: "" },
        patient: { id: a.patient_id, name: a.patient_name },
        fee: a.consultation_fee
    };
};

export const completeAppointment = async (id, doctorId, remarks) => {
    const { rows } = await pool.query(
        `UPDATE appointments SET status='completed', notes=COALESCE($1, notes), updated_at=NOW()
         WHERE id=$2 AND doctor_id=$3 AND LOWER(status::text) IN ('scheduled', 'pending') RETURNING id`,
        [remarks?.trim() || null, toInt(id), toInt(doctorId)]
    );
    if (rows.length) return { message: "Appointment completed successfully" };

    const a = await pool.query("SELECT doctor_id, status::text FROM appointments WHERE id=$1", [id]).then(r => r.rows[0]);
    if (!a) err("Appointment not found", 404);
    if (a.doctor_id != doctorId) err("Not authorized", 403);
    err(`Cannot complete: Appointment is ${a.status}`);
};

export const rescheduleAppointment = async (id, userId, userRole, hId, date, time) => {
    if (isSlotPast(date, time)) err("Cannot reschedule an appointment to a past date and time.", 400);
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows } = await client.query("SELECT patient_id, doctor_id, hospital_id FROM appointments WHERE id=$1 FOR UPDATE", [toInt(id)]);
        if (!rows[0]) err("Appointment not found", 404);

        const isOwner = rows[0].patient_id == userId || rows[0].doctor_id == userId;
        let isHospital = false;
        if (!isOwner && String(userRole || "").includes("hospital")) {
            const { rows: ha } = await client.query(
                "SELECT 1 FROM hospital_admin WHERE user_id=$1 AND hospital_id=$2",
                [toInt(userId), toInt(rows[0].hospital_id)]
            );
            isHospital = ha.length > 0;
        }
        if (!isOwner && !isHospital) err("Not authorized", 403);
        
        if (isHospital && toInt(hId) !== toInt(rows[0].hospital_id)) {
            err("Hospital admin can only reschedule within their own hospital.", 403);
        }

        await checkOverlap(client, rows[0].patient_id, rows[0].doctor_id, hId, date, time, id);
        await checkDoctorAvailability(client, rows[0].doctor_id, hId, date, time, id);
        await checkDoctorLeave(client, rows[0].doctor_id, hId, date, time);
        await client.query(
            "UPDATE appointments SET hospital_id=$1, appointment_date=$2::date, appointment_time=$3::time, updated_at=NOW() WHERE id=$4",
            [toInt(hId), date, time, id]
        );
        await client.query("COMMIT");

        const appt = await getAppointmentById(id);
        const dateStr = normalizeDateOnly(date);
        const timeStr = time;

        await Promise.all([
            createNotification({
                userId: appt.patient.id,
                type: "appointment_rescheduled",
                title: "Appointment Rescheduled",
                message: `Your appointment with Dr. ${appt.doctor.name} has been moved to ${dateStr} at ${timeStr}.`,
                metadata: { appointment_id: id }
            }),
            createNotification({
                userId: appt.doctor.id,
                type: "appointment_rescheduled",
                title: "Appointment Rescheduled",
                message: `The appointment with patient ${appt.patient.name} has been rescheduled to ${dateStr} at ${timeStr}.`,
                metadata: { appointment_id: id }
            })
        ]);

        return { message: "Appointment rescheduled successfully" };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally { client.release(); }
};

export const cancelAppointment = async (id, userId, userRole) => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows } = await client.query("SELECT * FROM appointments WHERE id=$1 FOR UPDATE", [toInt(id)]);
        const a = rows[0];
        if (!a) err("Appointment not found", 404);

        const isOwner = a.patient_id == userId || a.doctor_id == userId;
        let isHospital = false;
        if (!isOwner && String(userRole || "").includes("hospital")) {
            const { rows: ha } = await client.query(
                "SELECT 1 FROM hospital_admin WHERE user_id=$1 AND hospital_id=$2",
                [toInt(userId), toInt(a.hospital_id)]
            );
            isHospital = ha.length > 0;
        }
        if (!isOwner && !isHospital) err("Not authorized", 403);
        if (a.status == 'cancelled') err("Already cancelled");

        const apptDate = new Date(`${normalizeDateOnly(a.appointment_date)}T${normalizeTimeOnly(a.appointment_time)}`);
        if (Date.now() > apptDate.getTime() - 3600000) err("Must cancel at least 1 hour before");

        await client.query("UPDATE appointments SET status='cancelled', updated_at=NOW() WHERE id=$1", [id]);
        await client.query("COMMIT");

        const appt = await getAppointmentById(id);
        const dateStr = normalizeDateOnly(appt.date);
        const timeStr = normalizeTimeOnly(appt.time);
        
        await Promise.all([
            createNotification({
                userId: appt.patient.id,
                type: "appointment_cancelled",
                title: "Appointment Cancelled",
                message: `Your appointment with Dr. ${appt.doctor.name} on ${dateStr} at ${timeStr} has been cancelled.`,
                metadata: { appointment_id: id }
            }),
            createNotification({
                userId: appt.doctor.id,
                type: "appointment_cancelled",
                title: "Appointment Cancelled",
                message: `The appointment with patient ${appt.patient.name} on ${dateStr} at ${timeStr} has been cancelled.`,
                metadata: { appointment_id: id }
            })
        ]);

        return { message: "Appointment cancelled successfully" };
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally { client.release(); }
};

export const getAppointments = async (role, userId, query = {}) => {
    let conditions = [];
    let values = [];

    const normalizedRole = String(role || "").toLowerCase();

    if (normalizedRole === "doctor") {
        values.push(userId);
        conditions.push("a.doctor_id = $1");
    } else if (normalizedRole.includes("hospital")) {
        values.push(userId);
        conditions.push("a.hospital_id IN (SELECT hospital_id FROM hospital_admin WHERE user_id = $1)");
    } else if (normalizedRole.includes("admin")) {
        conditions.push("1=1");
    } else {
        values.push(userId);
        conditions.push("a.patient_id = $1");
    }

    const { status, mode, sort, fromDate, toDate, upcoming, search } = query;

    if (status) {
        const statuses = status.split(',').map(s => s.trim().toLowerCase());
        const placeholders = statuses.map((_, i) => `$${values.length + i + 1}`);
        conditions.push(`a.status IN (${placeholders.join(', ')})`);
        values.push(...statuses);
    }

    if (mode) {
        values.push(normalizeType(mode));
        conditions.push(`a.appointment_type = $${values.length}`);
    }

    if (fromDate) {
        values.push(fromDate);
        conditions.push(`a.appointment_date >= $${values.length}`);
    }

    if (toDate) {
        values.push(toDate);
        conditions.push(`a.appointment_date <= $${values.length}`);
    }

    if (upcoming === 'true') {
        conditions.push(`(a.appointment_date > CURRENT_DATE OR (a.appointment_date = CURRENT_DATE AND a.appointment_time >= CURRENT_TIME))`);
        conditions.push(`a.status = 'scheduled'`);
    }

    if (search) {
        values.push(`%${search.trim().toLowerCase()}%`);
        const pIdx = values.length;
        conditions.push(`(LOWER(doctor.full_name) LIKE $${pIdx} OR LOWER(patient.full_name) LIKE $${pIdx} OR LOWER(hospital.full_name) LIKE $${pIdx})`);
    }

    const where = conditions.join(" AND ");

    let orderBy = "ORDER BY a.appointment_date DESC, a.appointment_time DESC";
    if (sort === "date_asc") {
        orderBy = "ORDER BY a.appointment_date ASC, a.appointment_time ASC";
    }

    const { rows } = await pool.query(`${getBaseQuery(where)} ${orderBy}`, values);
    return rows.map(mapRow);
};

export const attachRecords = async (id, records, options = {}) => {
    const aId = toInt(id);
    const rIds = Array.isArray(records) ? [...new Set(records.map(r => parseInt(r)).filter(r => r > 0))] : [];
    if (!rIds.length) err("No records provided");

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const { rows: appt } = await client.query(
            "SELECT patient_id, doctor_id, hospital_id FROM appointments WHERE id=$1",
            [aId],
        );
        if (!appt[0]) err("Appointment not found", 404);
        const appointment = appt[0];

        if (options.requireAppointmentAccess) {
            if (!options.userId) err("Not authorized", 403);
            const userId = toInt(options.userId, "Not authorized");
            const role = String(options.role || "").toLowerCase();
            const isOwner = appointment.patient_id == userId || appointment.doctor_id == userId;
            let isHospital = false;

            if (!isOwner && role.includes("hospital")) {
                const { rows: hospitalRows } = await client.query(
                    "SELECT 1 FROM hospital_admin WHERE user_id=$1 AND hospital_id=$2 LIMIT 1",
                    [userId, appointment.hospital_id],
                );
                isHospital = hospitalRows.length > 0;
            }

            if (!isOwner && !isHospital && !role.includes("admin")) {
                err("Not authorized", 403);
            }
        }

        const { rows: valid } = await client.query("SELECT id FROM medical_records WHERE id=ANY($1::int[]) AND user_id=$2", [rIds, appointment.patient_id]);
        if (!valid.length) err("No valid records found");

        const values = valid.map((v, i) => `($1, $${i + 2})`).join(",");
        const { rows } = await client.query(`INSERT INTO appointment_records (appointment_id, record_id) VALUES ${values} ON CONFLICT DO NOTHING RETURNING *`, [aId, ...valid.map(v => v.id)]);
        await client.query("COMMIT");
        return rows;
    } catch (e) {
        await client.query("ROLLBACK");
        throw e;
    } finally { client.release(); }
};
