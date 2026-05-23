import pool from "../config/db.js";

import {
    normalizeDayOfWeek,
    normalizeTimeOnly,
    parseJson,
    timeToMinutes,
} from "./schedule.shared.js";
import { createNotification } from "./notification.service.js";
import {
    ADMIN_ROLES,
    HOSPITAL_ROLES,
    titleCase,
    normalizeRole,
    normalizeStatus,
    parsePositiveInt,
    parseOptionalNonNegativeInt as parseOptionalFee,
} from "../utils/helpers.js";

const DAY_ORDER = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
};
const DEFAULT_SLOT_INTERVAL = 20;
const MIN_SLOT_INTERVAL = 5;

const formatScheduleTimeLabel = (value = "") => {
    const normalized = normalizeTimeOnly(value);
    if (!normalized) return String(value || "");

    const [hourText, minuteText] = normalized.split(":");
    const hour = Number.parseInt(hourText, 10);
    if (!Number.isFinite(hour)) return normalized;

    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 === 0 ? 12 : hour % 12;
    return `${displayHour}:${minuteText} ${suffix}`;
};

const toRequestedScheduleArray = (value) => {
    if (Array.isArray(value)) return value;
    const parsed = parseJson(value, []);
    return Array.isArray(parsed) ? parsed : [];
};

const normalizeRequestedScheduleRows = (value, { strict = false } = {}) => {
    const normalizedRows = [];

    toRequestedScheduleArray(value).forEach((row, index) => {
        const rawDay = row?.day_of_week ?? row?.dayOfWeek ?? "";
        const rawStartTime = row?.start_time ?? row?.startTime ?? "";
        const rawEndTime = row?.end_time ?? row?.endTime ?? "";
        const rawInterval = row?.slot_interval_minutes ?? row?.slotIntervalMinutes ?? "";
        const hasAnyValue = [rawDay, rawStartTime, rawEndTime, rawInterval].some(
            (item) => String(item ?? "").trim() !== ""
        );

        if (!hasAnyValue) return;

        const dayOfWeek = normalizeDayOfWeek(rawDay);
        const startTime = normalizeTimeOnly(rawStartTime);
        const endTime = normalizeTimeOnly(rawEndTime);

        if (!dayOfWeek || !startTime || !endTime) {
            if (strict) {
                const error = new Error(`Requested schedule row ${index + 1} is incomplete.`);
                error.status = 400;
                throw error;
            }
            return;
        }

        const startMinutes = timeToMinutes(startTime);
        const endMinutes = timeToMinutes(endTime);
        if (startMinutes === null || endMinutes === null || endMinutes <= startMinutes) {
            if (strict) {
                const error = new Error(`Requested schedule row ${index + 1} has an invalid time range.`);
                error.status = 400;
                throw error;
            }
            return;
        }

        const parsedInterval = Number.parseInt(rawInterval, 10);
        const slotIntervalMinutes =
            Number.isInteger(parsedInterval) && parsedInterval > 0
                ? Math.max(MIN_SLOT_INTERVAL, parsedInterval)
                : DEFAULT_SLOT_INTERVAL;

        normalizedRows.push({
            day_of_week: dayOfWeek,
            start_time: startTime,
            end_time: endTime,
            slot_interval_minutes: slotIntervalMinutes,
        });
    });

    const sortedRows = [...normalizedRows].sort((a, b) => {
        const dayOrderDiff = (DAY_ORDER[a.day_of_week] || 99) - (DAY_ORDER[b.day_of_week] || 99);
        if (dayOrderDiff !== 0) return dayOrderDiff;
        return (timeToMinutes(a.start_time) || 0) - (timeToMinutes(b.start_time) || 0);
    });

    if (strict && sortedRows.length === 0) {
        const error = new Error("Add at least one requested schedule row.");
        error.status = 400;
        throw error;
    }

    if (strict) {
        const seenDays = new Set();
        for (const row of sortedRows) {
            if (seenDays.has(row.day_of_week)) {
                const error = new Error(`Day ${row.day_of_week} is already added to this request.`);
                error.status = 400;
                throw error;
            }
            seenDays.add(row.day_of_week);
        }
    }

    return sortedRows;
};

const timeRangesOverlap = (startA, endA, startB, endB) => {
    const normalizedStartA = timeToMinutes(startA);
    const normalizedEndA = timeToMinutes(endA);
    const normalizedStartB = timeToMinutes(startB);
    const normalizedEndB = timeToMinutes(endB);

    if (
        normalizedStartA === null ||
        normalizedEndA === null ||
        normalizedStartB === null ||
        normalizedEndB === null
    ) {
        return false;
    }

    return normalizedStartA < normalizedEndB && normalizedStartB < normalizedEndA;
};

const buildRequestedScheduleConflictMessage = ({
    requestedRow,
    conflictingRow,
    conflictingLabel,
}) =>
    `${requestedRow.day_of_week} ${formatScheduleTimeLabel(requestedRow.start_time)} to ${formatScheduleTimeLabel(
        requestedRow.end_time
    )} conflicts with ${conflictingLabel} (${formatScheduleTimeLabel(conflictingRow.start_time)} to ${formatScheduleTimeLabel(
        conflictingRow.end_time
    )}).`;

const assertRequestedScheduleHasNoConflicts = async ({
    doctorId,
    requestedSchedule,
    excludeRequestId = null,
    excludeAssignmentId = null,
}, client = pool) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRequestedSchedule = normalizeRequestedScheduleRows(requestedSchedule, { strict: true });

    for (let index = 0; index < normalizedRequestedSchedule.length; index += 1) {
        const currentRow = normalizedRequestedSchedule[index];
        const otherRows = normalizedRequestedSchedule.slice(index + 1);
        const selfConflict = otherRows.find(
            (row) =>
                row.day_of_week === currentRow.day_of_week &&
                timeRangesOverlap(currentRow.start_time, currentRow.end_time, row.start_time, row.end_time)
        );

        if (selfConflict) {
            const error = new Error(`Requested schedule rows overlap on ${currentRow.day_of_week}.`);
            error.status = 400;
            throw error;
        }
    }

    const { rows: activeScheduleRows } = await client.query(
        `
          SELECT
            av.day_of_week,
            av.start_time,
            av.end_time,
            h.full_name AS hospital_name
          FROM doctor_hospital_assignments a
          JOIN assignment_availability av ON av.assignment_id = a.id
          LEFT JOIN hospitals h ON h.id = a.hospital_id
          WHERE a.doctor_id = $1
            AND ($2::int IS NULL OR a.id <> $2)
          ORDER BY a.id ASC, av.day_of_week ASC, av.start_time ASC
        `,
        [normalizedDoctorId, excludeAssignmentId ? Number(excludeAssignmentId) : null]
    );

    for (const requestedRow of normalizedRequestedSchedule) {
        const conflictingActiveRow = activeScheduleRows.find(
            (row) =>
                normalizeDayOfWeek(row.day_of_week) === requestedRow.day_of_week &&
                timeRangesOverlap(requestedRow.start_time, requestedRow.end_time, row.start_time, row.end_time)
        );

        if (conflictingActiveRow) {
            const error = new Error(
                buildRequestedScheduleConflictMessage({
                    requestedRow,
                    conflictingRow: conflictingActiveRow,
                    conflictingLabel: `${conflictingActiveRow.hospital_name || "an existing hospital schedule"}`,
                })
            );
            error.status = 409;
            throw error;
        }
    }

    const { rows: pendingTasks } = await client.query(
        `
          SELECT 'affiliation' as type, id, requested_schedule, NULL as schedule_rows, hospital_id FROM doctor_affiliation_requests
          WHERE doctor_id = $1 AND LOWER(status::text) = 'pending' AND ($2::int IS NULL OR id <> $2)
          UNION ALL
          SELECT 'change' as type, scr.id, NULL as requested_schedule,
            JSON_AGG(JSON_BUILD_OBJECT('day_of_week', scra.day_of_week, 'start_time', scra.start_time, 'end_time', scra.end_time, 'slot_interval_minutes', scra.slot_interval_minutes)) as schedule_rows,
            a.hospital_id
          FROM schedule_change_requests scr
          JOIN doctor_hospital_assignments a ON a.id = scr.assignment_id
          JOIN schedule_change_request_availability scra ON scra.schedule_change_request_id = scr.id
          WHERE a.doctor_id = $1 AND LOWER(scr.status::text) = 'pending' AND ($3::int IS NULL OR scr.id <> $3)
          GROUP BY scr.id, a.hospital_id
        `,
        [
            normalizedDoctorId,
            excludeRequestId ? Number(excludeRequestId) : null,
            null // We could pass excludeScheduleChangeRequestId if we had one
        ]
    );

    const { rows: hospitalRows } = await pool.query("SELECT id, full_name FROM hospitals");
    const hospitalMap = new Map(hospitalRows.map(h => [h.id, h.full_name]));

    for (const task of pendingTasks) {
        const schedule = task.type === 'affiliation'
            ? normalizeRequestedScheduleRows(task.requested_schedule, { strict: false })
            : (Array.isArray(task.schedule_rows) ? task.schedule_rows : []);
        
        if (!schedule.length) continue;

        for (const requestedRow of normalizedRequestedSchedule) {
            const conflict = schedule.find(
                (row) =>
                    row.day_of_week === requestedRow.day_of_week &&
                    timeRangesOverlap(requestedRow.start_time, requestedRow.end_time, row.start_time, row.end_time)
            );

            if (conflict) {
                const hospitalName = hospitalMap.get(task.hospital_id) || "another hospital";
                const error = new Error(
                    buildRequestedScheduleConflictMessage({
                        requestedRow,
                        conflictingRow: conflict,
                        conflictingLabel: `your pending ${hospitalName} request`,
                    })
                );
                error.status = 409;
                throw error;
            }
        }
    }

    return normalizedRequestedSchedule;
};

const insertRequestedScheduleForAssignment = async ({
    client,
    assignmentId,
    requestedSchedule = [],
}) => {
    const normalizedAssignmentId = parsePositiveInt(assignmentId, "Invalid assignment id.");
    const normalizedRequestedSchedule = normalizeRequestedScheduleRows(requestedSchedule, { strict: false });
    if (!normalizedRequestedSchedule.length) return;

    for (const row of normalizedRequestedSchedule) {
        await client.query(
            `
              INSERT INTO assignment_availability (
                assignment_id,
                day_of_week,
                start_time,
                end_time,
                slot_interval_minutes
              )
              VALUES ($1, $2, $3, $4, $5)
            `,
            [
                normalizedAssignmentId,
                row.day_of_week,
                row.start_time,
                row.end_time,
                row.slot_interval_minutes,
            ]
        );
    }
};

const normalizeApprovalDecision = (value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (!["approved", "rejected"].includes(normalized)) {
        const error = new Error("Invalid review status.");
        error.status = 400;
        throw error;
    }
    return normalized;
};

const resolveOverallStatus = ({ hospitalApprovalStatus, doctorApprovalStatus }) => {
    const normalizedHospitalStatus = normalizeStatus(hospitalApprovalStatus);
    const normalizedDoctorStatus = normalizeStatus(doctorApprovalStatus);

    if (normalizedHospitalStatus === "rejected" || normalizedDoctorStatus === "rejected") return "rejected";
    if (normalizedHospitalStatus === "approved" && normalizedDoctorStatus === "approved") return "approved";
    return "pending";
};

const getPendingWith = ({ status, hospitalApprovalStatus, doctorApprovalStatus }) => {
    if (normalizeStatus(status) !== "pending") return "closed";
    if (normalizeStatus(hospitalApprovalStatus) === "pending") return "hospital";
    if (normalizeStatus(doctorApprovalStatus) === "pending") return "doctor";
    return "closed";
};

const mapAffiliationRequestRow = (row = {}) => {
    const requestStatus = normalizeStatus(row.status || row.request_status);
    const hospitalApprovalStatus = normalizeStatus(row.hospital_approval_status);
    const doctorApprovalStatus = normalizeStatus(row.doctor_approval_status);
    const requestInitiator = normalizeRole(row.request_initiator);
    const requestSource = requestInitiator === "doctor" ? "doctor" : "hospital_admin";

    return {
        request_id: row.request_id,
        doctor_id: row.doctor_id,
        hospital_id: row.hospital_id,
        doctor_name: row.doctor_name || "Doctor",
        doctor_profile_picture: row.doctor_profile_picture || "",
        hospital_name: row.hospital_name || "Hospital",
        department_name: row.department_name || "General",
        request_source: requestSource,
        request_message: row.request_message || "",
        consultation_fee: row.consultation_fee ?? null,
        request_status: titleCase(requestStatus),
        hospital_approval_status: titleCase(hospitalApprovalStatus),
        doctor_approval_status: titleCase(doctorApprovalStatus),
        pending_with: getPendingWith({
            status: requestStatus,
            hospitalApprovalStatus,
            doctorApprovalStatus,
        }),
        admin_notes: row.admin_notes || "",
        doctor_notes: row.doctor_notes || "",
        requested_schedule: normalizeRequestedScheduleRows(row.requested_schedule, { strict: false }),
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
        updated_at: row.updated_at || null,
        reviewed_at: row.reviewed_at || row.updated_at || row.created_at || null,
        verification_documents: Array.isArray(row.verification_documents) ? row.verification_documents : [],
    };
};

const mapLeaveRequestRow = (row = {}) => ({
    request_id: row.request_id ?? row.leave_id,
    leave_id: row.request_id ?? row.leave_id,
    request_type: "leave",
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name || "Doctor",
    doctor_profile_picture: row.doctor_profile_picture || "",
    specialization_name: row.specialization_name || "General Medicine",
    hospital_name: row.hospital_name || "Hospital",
    department_name: row.department_name || "General",
    assignment_id: row.assignment_id,
    leave_type: row.leave_type || "full_day",
    start_date: row.start_date || null,
    end_date: row.end_date || null,
    start_time: row.start_time || null,
    end_time: row.end_time || null,
    reason: row.reason || "",
    status: titleCase(row.status),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    reviewed_at: row.reviewed_at || null,
});

const mapScheduleChangeRequestRow = (row = {}) => ({
    request_id: row.request_id,
    request_type: "schedule_change",
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name || "Doctor",
    doctor_profile_picture: row.doctor_profile_picture || "",
    specialization_name: row.specialization_name || "General Medicine",
    hospital_name: row.hospital_name || "Hospital",
    department_name: row.department_name || "General",
    assignment_id: row.assignment_id,
    effective_from: row.effective_from || null,
    reason: row.reason || "",
    status: titleCase(row.status),
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
    reviewed_at: row.reviewed_at || null,
    requested_schedule: Array.isArray(row.requested_schedule) ? row.requested_schedule : [],
});

const getHospitalContextForUser = async ({ userId }, client = pool) => {
    const normalizedUserId = parsePositiveInt(userId, "Invalid hospital user.");
    const { rows } = await client.query(
        `
          SELECT h.id AS hospital_id, h.full_name AS hospital_name
          FROM hospital_admin ha
          JOIN hospitals h ON h.id = ha.hospital_id
          WHERE ha.user_id = $1
          LIMIT 1
        `,
        [normalizedUserId]
    );

    return rows[0] || null;
};

const assertHospitalReviewerAccess = async ({ reviewerId, reviewerRole, hospitalId }, client = pool) => {
    const normalizedRole = normalizeRole(reviewerRole);
    if (ADMIN_ROLES.has(normalizedRole)) return;

    if (!HOSPITAL_ROLES.has(normalizedRole)) {
        const error = new Error("Only hospital admins can review this request.");
        error.status = 403;
        throw error;
    }

    const hospitalContext = await getHospitalContextForUser({ userId: reviewerId }, client);
    if (!hospitalContext || Number(hospitalContext.hospital_id) !== Number(hospitalId)) {
        const error = new Error("You do not have access to review this request.");
        error.status = 403;
        throw error;
    }
};

const ensureDoctorExists = async ({ doctorId }, client = pool) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const { rows } = await client.query(
        `
          SELECT d.id, u.full_name AS doctor_name
          FROM doctors d
          JOIN users u ON u.id = d.id
          WHERE d.id = $1
          LIMIT 1
        `,
        [normalizedDoctorId]
    );

    if (!rows.length) {
        const error = new Error("Doctor not found.");
        error.status = 404;
        throw error;
    }

    return rows[0];
};

const ensureHospitalExists = async ({ hospitalId }, client = pool) => {
    const normalizedHospitalId = parsePositiveInt(hospitalId, "Invalid hospital id.");
    const { rows } = await client.query(
        `
          SELECT id, full_name
          FROM hospitals
          WHERE id = $1
          LIMIT 1
        `,
        [normalizedHospitalId]
    );

    if (!rows.length) {
        const error = new Error("Hospital not found.");
        error.status = 404;
        throw error;
    }

    return rows[0];
};

const getDoctorAssignmentsSnapshot = async (doctorId, client = pool) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const { rows } = await client.query(
        `
          SELECT
            a.id AS assignment_id,
            a.hospital_id,
            h.full_name AS hospital_name
          FROM doctor_hospital_assignments a
          LEFT JOIN hospitals h ON h.id = a.hospital_id
          WHERE a.doctor_id = $1
          ORDER BY a.created_at ASC NULLS LAST, a.id ASC
        `,
        [normalizedDoctorId]
    );

    return rows.map((row) => ({
        assignment_id: row.assignment_id,
        hospital_id: row.hospital_id,
        hospital_name: row.hospital_name || "Hospital unavailable",
        department_name: "General",
        assignment_status: "Active",
    }));
};

const getDoctorScheduleSnapshot = async ({ doctorId }) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const [slots, recurringSchedule, assignments] = await Promise.all([
        findAvailableSlotsForDoctor({
            doctorId: normalizedDoctorId,
            day: "any",
            timeOfDay: "any",
            limit: 120,
        }),
        getDoctorWeeklyAvailability({ doctorId: normalizedDoctorId }),
        getDoctorAssignmentsSnapshot(normalizedDoctorId),
    ]);

    return {
        slots: Array.isArray(slots) ? slots : [],
        recurringSchedule: Array.isArray(recurringSchedule) ? recurringSchedule : [],
        assignments: Array.isArray(assignments) ? assignments : [],
    };
};

const createDoctorHospitalAssignment = async ({ client, doctorId, hospitalId, fee = 0.00 }) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedHospitalId = parsePositiveInt(hospitalId, "Invalid hospital id.");
    const normalizedFee = parseOptionalFee(fee) || 0.00;

    const { rows: existingRows } = await client.query(
        `
          SELECT id
          FROM doctor_hospital_assignments
          WHERE doctor_id = $1
            AND hospital_id = $2
          LIMIT 1
        `,
        [normalizedDoctorId, normalizedHospitalId]
    );

    if (existingRows.length > 0) {
        // Update the fee if assignment already exists
        await client.query(
            "UPDATE doctor_hospital_assignments SET fee = $1, updated_at = NOW() WHERE id = $2",
            [normalizedFee, existingRows[0].id]
        );
        return existingRows[0].id;
    }

    const { rows } = await client.query(
        `
          INSERT INTO doctor_hospital_assignments (doctor_id, hospital_id, fee, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id
        `,
        [normalizedDoctorId, normalizedHospitalId, normalizedFee]
    );

    return rows[0]?.id ?? null;
};

const ensureNoExistingAffiliationConflict = async ({ doctorId, hospitalId }, client = pool) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedHospitalId = parsePositiveInt(hospitalId, "Invalid hospital id.");

    const { rows: assignmentRows } = await client.query(
        `
          SELECT id
          FROM doctor_hospital_assignments
          WHERE doctor_id = $1
            AND hospital_id = $2
          LIMIT 1
        `,
        [normalizedDoctorId, normalizedHospitalId]
    );

    if (assignmentRows.length > 0) {
        const error = new Error("This doctor is already linked with the selected hospital.");
        error.status = 409;
        throw error;
    }

    const { rows: pendingRows } = await client.query(
        `
          SELECT id
          FROM doctor_affiliation_requests
          WHERE doctor_id = $1
            AND hospital_id = $2
            AND LOWER(status::text) = 'pending'
          LIMIT 1
        `,
        [normalizedDoctorId, normalizedHospitalId]
    );

    if (pendingRows.length > 0) {
        const error = new Error("A pending affiliation request already exists for this doctor and hospital.");
        error.status = 409;
        throw error;
    }
};

const getAffiliationRequestList = async ({ whereClause = "1=1", values = [] }, client = pool) => {
    const { rows } = await client.query(
        `
          SELECT
            r.id AS request_id,
            r.doctor_id,
            r.hospital_id,
            r.request_initiator::text AS request_initiator,
            r.request_message,
            r.consultation_fee,
            r.requested_schedule,
            r.status::text AS status,
            r.hospital_approval_status::text AS hospital_approval_status,
            r.doctor_approval_status::text AS doctor_approval_status,
            r.admin_notes,
            r.doctor_notes,
            r.created_at,
            r.updated_at,
            GREATEST(
              COALESCE(r.hospital_reviewed_at, TIMESTAMP 'epoch'),
              COALESCE(r.doctor_reviewed_at, TIMESTAMP 'epoch'),
              COALESCE(r.updated_at, TIMESTAMP 'epoch')
            ) AS reviewed_at,
            u.full_name AS doctor_name,
            u.profile_picture AS doctor_profile_picture,
            h.full_name AS hospital_name,
            COALESCE(docs.verification_documents, '[]'::json) AS verification_documents
          FROM doctor_affiliation_requests r
          JOIN doctors d ON d.id = r.doctor_id
          JOIN users u ON u.id = d.id
          JOIN hospitals h ON h.id = r.hospital_id
          LEFT JOIN LATERAL (
            SELECT JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', vd.id,
                'document_type', vd.document_type,
                'document_url', vd.document_url,
                'file_name', vd.file_name,
                'status', vd.status::text
              )
              ORDER BY vd.created_at DESC, vd.id DESC
            ) AS verification_documents
            FROM verification_documents vd
            WHERE vd.user_id = u.id
          ) docs ON TRUE
          WHERE ${whereClause}
          ORDER BY r.created_at DESC, r.id DESC
        `,
        values
    );

    return rows.map(mapAffiliationRequestRow);
};

const getAffiliationRequestForUpdate = async ({ requestId }, client) => {
    const normalizedRequestId = parsePositiveInt(requestId, "Invalid request id.");
    const { rows } = await client.query(
        `
          SELECT *
          FROM doctor_affiliation_requests
          WHERE id = $1
          LIMIT 1
          FOR UPDATE
        `,
        [normalizedRequestId]
    );

    if (!rows.length) {
        const error = new Error("Affiliation request not found.");
        error.status = 404;
        throw error;
    }

    return rows[0];
};

const getAssignmentForDoctor = async ({ doctorId, assignmentId }, client = pool) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedAssignmentId = parsePositiveInt(assignmentId, "Invalid assignment id.");

    const { rows } = await client.query(
        `
          SELECT
            a.id AS assignment_id,
            a.doctor_id,
            a.hospital_id,
            h.full_name AS hospital_name
          FROM doctor_hospital_assignments a
          JOIN hospitals h ON h.id = a.hospital_id
          WHERE a.id = $1
            AND a.doctor_id = $2
          LIMIT 1
        `,
        [normalizedAssignmentId, normalizedDoctorId]
    );

    if (!rows.length) {
        const error = new Error("Assignment not found for this doctor.");
        error.status = 404;
        throw error;
    }

    return rows[0];
};

const getDoctorSpecializationMap = async ({ doctorIds = [] }, client = pool) => {
    const normalizedDoctorIds = [...new Set((Array.isArray(doctorIds) ? doctorIds : [])
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0))];

    if (!normalizedDoctorIds.length) return new Map();

    const { rows } = await client.query(
        `
          SELECT
            ds.doctor_id,
            STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name) AS specialization_name
          FROM doctor_specializations ds
          JOIN specializations s ON s.id = ds.specialization_id
          WHERE ds.doctor_id = ANY($1::int[])
          GROUP BY ds.doctor_id
        `,
        [normalizedDoctorIds]
    );

    return new Map(rows.map((row) => [Number(row.doctor_id), row.specialization_name || "General Medicine"]));
};

export const createDoctorAssignmentRequest = async ({
    doctorId,
    hospitalId,
    requesterId,
    consultationFee = null,
    requestMessage = null,
    requestedSchedule = [],
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const normalizedHospitalId = parsePositiveInt(hospitalId, "Invalid hospital id.");

    if (normalizedDoctorId !== normalizedRequesterId) {
        const error = new Error("Not authorized to create this affiliation request.");
        error.status = 403;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        await ensureDoctorExists({ doctorId: normalizedDoctorId }, client);
        await ensureHospitalExists({ hospitalId: normalizedHospitalId }, client);
        await ensureNoExistingAffiliationConflict({
            doctorId: normalizedDoctorId,
            hospitalId: normalizedHospitalId,
        }, client);
        const normalizedRequestedSchedule = await assertRequestedScheduleHasNoConflicts({
            doctorId: normalizedDoctorId,
            requestedSchedule,
        }, client);

        const { rows } = await client.query(
            `
              INSERT INTO doctor_affiliation_requests (
                doctor_id,
                hospital_id,
                request_initiator,
                initiator_id,
                approver_id,
                status,
                request_message,
                consultation_fee,
                requested_schedule,
                doctor_notes,
                admin_notes,
                hospital_approval_status,
                doctor_approval_status,
                hospital_reviewed_at,
                doctor_reviewed_at,
                created_at,
                updated_at
              )
              VALUES (
                $1,
                $2,
                'doctor',
                $3,
                NULL,
                'pending',
                $4,
                $5,
                $6::jsonb,
                NULL,
                NULL,
                'pending',
                'approved',
                NULL,
                NOW(),
                NOW(),
                NOW()
              )
              RETURNING id
            `,
            [
                normalizedDoctorId,
                normalizedHospitalId,
                normalizedRequesterId,
                String(requestMessage || "").trim() || null,
                parseOptionalFee(consultationFee),
                JSON.stringify(normalizedRequestedSchedule),
            ]
        );

        await client.query("COMMIT");
        return {
            requestId: rows[0]?.id ?? null,
            requests: await getDoctorAssignmentRequests({
                doctorId: normalizedDoctorId,
                includeNonPending: true,
            }),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        console.error("Error creating doctor affiliation request:", error);
        throw { status: 500, message: "Failed to create doctor affiliation request." };
    } finally {
        client.release();
    }
};

export const createHospitalDoctorAssignmentRequest = async ({
    requesterId,
    requesterRole,
    hospitalId = null,
    doctorId,
    consultationFee = null,
    requestMessage = null,
    requestedSchedule = [],
}) => {
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRole = normalizeRole(requesterRole);

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        let resolvedHospitalId = hospitalId ? parsePositiveInt(hospitalId, "Invalid hospital id.") : null;

        if (HOSPITAL_ROLES.has(normalizedRole)) {
            const hospitalContext = await getHospitalContextForUser({ userId: normalizedRequesterId }, client);
            if (!hospitalContext) {
                const error = new Error("Hospital context not found for this account.");
                error.status = 404;
                throw error;
            }
            resolvedHospitalId = Number(hospitalContext.hospital_id);
        }

        if (!resolvedHospitalId) {
            const error = new Error("Hospital id is required to create this request.");
            error.status = 400;
            throw error;
        }

        await ensureDoctorExists({ doctorId: normalizedDoctorId }, client);
        await ensureHospitalExists({ hospitalId: resolvedHospitalId }, client);
        await ensureNoExistingAffiliationConflict({
            doctorId: normalizedDoctorId,
            hospitalId: resolvedHospitalId,
        }, client);
        const normalizedRequestedSchedule = normalizeRequestedScheduleRows(requestedSchedule, { strict: false });
        if (normalizedRequestedSchedule.length > 0) {
            await assertRequestedScheduleHasNoConflicts({
                doctorId: normalizedDoctorId,
                requestedSchedule: normalizedRequestedSchedule,
            }, client);
        }

        const { rows } = await client.query(
            `
              INSERT INTO doctor_affiliation_requests (
                doctor_id,
                hospital_id,
                request_initiator,
                initiator_id,
                approver_id,
                status,
                request_message,
                consultation_fee,
                requested_schedule,
                doctor_notes,
                admin_notes,
                hospital_approval_status,
                doctor_approval_status,
                hospital_reviewed_at,
                doctor_reviewed_at,
                created_at,
                updated_at
              )
              VALUES (
                $1,
                $2,
                'hospital',
                $3,
                NULL,
                'pending',
                $4,
                $5,
                $6::jsonb,
                NULL,
                NULL,
                'approved',
                'pending',
                NOW(),
                NULL,
                NOW(),
                NOW()
              )
              RETURNING id
            `,
            [
                normalizedDoctorId,
                resolvedHospitalId,
                normalizedRequesterId,
                String(requestMessage || "").trim() || null,
                parseOptionalFee(consultationFee),
                normalizedRequestedSchedule.length > 0 ? JSON.stringify(normalizedRequestedSchedule) : null,
            ]
        );

        await client.query("COMMIT");
        return {
            requestId: rows[0]?.id ?? null,
            requests: await getHospitalDoctorAssignmentRequests({
                requesterId: normalizedRequesterId,
                requesterRole,
                includeNonPending: true,
            }),
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        console.error("Error creating hospital doctor request:", error);
        throw { status: 500, message: "Failed to create hospital doctor affiliation request." };
    } finally {
        client.release();
    }
};

export const getHospitalDoctorAssignmentRequests = async ({
    requesterId,
    requesterRole,
    includeNonPending = true,
}) => {
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const normalizedRole = normalizeRole(requesterRole);

    if (!ADMIN_ROLES.has(normalizedRole)) {
        const hospitalContext = await getHospitalContextForUser({ userId: normalizedRequesterId });
        if (!hospitalContext) {
            const error = new Error("Hospital context not found for this account.");
            error.status = 404;
            throw error;
        }

        await assertHospitalReviewerAccess({
            reviewerId: normalizedRequesterId,
            reviewerRole: requesterRole,
            hospitalId: hospitalContext.hospital_id,
        });

        const conditions = [`r.hospital_id = $1`];
        if (!includeNonPending) {
            conditions.push(`LOWER(r.status::text) = 'pending'`);
        }

        return getAffiliationRequestList({
            whereClause: conditions.join(" AND "),
            values: [Number(hospitalContext.hospital_id)],
        });
    }

    const conditions = [];
    if (!includeNonPending) {
        conditions.push(`LOWER(r.status::text) = 'pending'`);
    }

    return getAffiliationRequestList({
        whereClause: conditions.length > 0 ? conditions.join(" AND ") : "1=1",
        values: [],
    });
};

export const getDoctorAssignmentRequests = async ({
    doctorId,
    includeNonPending = true,
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const values = [normalizedDoctorId];
    const conditions = [`r.doctor_id = $1`];

    if (!includeNonPending) {
        conditions.push(`LOWER(r.status::text) = 'pending'`);
    }

    return getAffiliationRequestList({
        whereClause: conditions.join(" AND "),
        values,
    });
};

export const getDoctorAssignmentRequestsForReviewer = async ({
    reviewerId,
    reviewerRole,
}) => {
    const normalizedReviewerId = parsePositiveInt(reviewerId, "Invalid reviewer.");
    const normalizedRole = normalizeRole(reviewerRole);

    if (ADMIN_ROLES.has(normalizedRole)) {
        return getAffiliationRequestList({
            whereClause: `LOWER(r.status::text) = 'pending'`,
            values: [],
        });
    }

    const hospitalContext = await getHospitalContextForUser({ userId: normalizedReviewerId });
    if (!hospitalContext) return [];

    return getAffiliationRequestList({
        whereClause: `
          r.hospital_id = $1
          AND LOWER(r.status::text) = 'pending'
          AND LOWER(r.hospital_approval_status::text) = 'pending'
        `,
        values: [Number(hospitalContext.hospital_id)],
    });
};

export const reviewDoctorAssignmentRequest = async ({
    requestId,
    reviewerId,
    reviewerRole,
    decision,
    adminNotes = null,
}) => {
    const normalizedReviewerId = parsePositiveInt(reviewerId, "Invalid reviewer.");
    const normalizedDecision = normalizeApprovalDecision(decision);
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const request = await getAffiliationRequestForUpdate({ requestId }, client);
        await assertHospitalReviewerAccess({
            reviewerId: normalizedReviewerId,
            reviewerRole,
            hospitalId: request.hospital_id,
        }, client);

        if (normalizeStatus(request.status) !== "pending" || normalizeStatus(request.hospital_approval_status) !== "pending") {
            const error = new Error("This affiliation request is no longer waiting for hospital review.");
            error.status = 409;
            throw error;
        }

        const nextHospitalApprovalStatus = normalizedDecision;
        const nextDoctorApprovalStatus = normalizeStatus(request.doctor_approval_status);
        const nextOverallStatus = resolveOverallStatus({
            hospitalApprovalStatus: nextHospitalApprovalStatus,
            doctorApprovalStatus: nextDoctorApprovalStatus,
        });

        let assignmentId = null;
        if (nextOverallStatus === "approved") {
            const pendingRequestedSchedule = normalizeRequestedScheduleRows(request.requested_schedule, { strict: false });
            assignmentId = await createDoctorHospitalAssignment({
                client,
                doctorId: request.doctor_id,
                hospitalId: request.hospital_id,
                fee: request.consultation_fee,
            });
            if (pendingRequestedSchedule.length > 0) {
                const normalizedRequestedSchedule = await assertRequestedScheduleHasNoConflicts({
                    doctorId: request.doctor_id,
                    requestedSchedule: pendingRequestedSchedule,
                    excludeRequestId: request.id,
                }, client);
                await insertRequestedScheduleForAssignment({
                    client,
                    assignmentId,
                    requestedSchedule: normalizedRequestedSchedule,
                });
            }
        }

        await client.query(
            `
              UPDATE doctor_affiliation_requests
              SET hospital_approval_status = $1::approval_status_enum,
                  status = $2::approval_status_enum,
                  approver_id = CASE WHEN $2 = 'pending' THEN approver_id ELSE $3 END,
                  admin_notes = COALESCE($4, admin_notes),
                  hospital_reviewed_at = NOW(),
                  updated_at = NOW()
              WHERE id = $5
            `,
            [
                nextHospitalApprovalStatus,
                nextOverallStatus,
                normalizedReviewerId,
                String(adminNotes || "").trim() || null,
                request.id,
            ]
        );

        await client.query("COMMIT");
        return {
            requestId: request.id,
            assignmentId,
            status: nextOverallStatus,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        console.error("Error reviewing hospital affiliation request:", error);
        throw { status: 500, message: error.message || "Failed to review affiliation request." };
    } finally {
        client.release();
    }
};

export const reviewDoctorAssignmentRequestByDoctor = async ({
    requestId,
    doctorId,
    decision,
    doctorNotes = null,
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor.");
    const normalizedDecision = normalizeApprovalDecision(decision);
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const request = await getAffiliationRequestForUpdate({ requestId }, client);
        if (Number(request.doctor_id) !== normalizedDoctorId) {
            const error = new Error("You do not have access to review this affiliation request.");
            error.status = 403;
            throw error;
        }

        if (normalizeStatus(request.status) !== "pending" || normalizeStatus(request.doctor_approval_status) !== "pending") {
            const error = new Error("This affiliation request is no longer waiting for doctor review.");
            error.status = 409;
            throw error;
        }

        const nextDoctorApprovalStatus = normalizedDecision;
        const nextHospitalApprovalStatus = normalizeStatus(request.hospital_approval_status);
        const nextOverallStatus = resolveOverallStatus({
            hospitalApprovalStatus: nextHospitalApprovalStatus,
            doctorApprovalStatus: nextDoctorApprovalStatus,
        });

        let assignmentId = null;
        if (nextOverallStatus === "approved") {
            const pendingRequestedSchedule = normalizeRequestedScheduleRows(request.requested_schedule, { strict: false });
            assignmentId = await createDoctorHospitalAssignment({
                client,
                doctorId: request.doctor_id,
                hospitalId: request.hospital_id,
                fee: request.consultation_fee,
            });
            if (pendingRequestedSchedule.length > 0) {
                const normalizedRequestedSchedule = await assertRequestedScheduleHasNoConflicts({
                    doctorId: request.doctor_id,
                    requestedSchedule: pendingRequestedSchedule,
                    excludeRequestId: request.id,
                }, client);
                await insertRequestedScheduleForAssignment({
                    client,
                    assignmentId,
                    requestedSchedule: normalizedRequestedSchedule,
                });
            }
        }

        await client.query(
            `
              UPDATE doctor_affiliation_requests
              SET doctor_approval_status = $1::approval_status_enum,
                  status = $2::approval_status_enum,
                  approver_id = CASE WHEN $2 = 'pending' THEN approver_id ELSE $3 END,
                  doctor_notes = COALESCE($4, doctor_notes),
                  doctor_reviewed_at = NOW(),
                  updated_at = NOW()
              WHERE id = $5
            `,
            [
                nextDoctorApprovalStatus,
                nextOverallStatus,
                normalizedDoctorId,
                String(doctorNotes || "").trim() || null,
                request.id,
            ]
        );

        await client.query("COMMIT");
        return {
            requestId: request.id,
            assignmentId,
            status: nextOverallStatus,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        console.error("Error reviewing doctor affiliation request:", error);
        throw { status: 500, message: error.message || "Failed to review affiliation request." };
    } finally {
        client.release();
    }
};

export const getDoctorLeaveRequests = async ({
    doctorId,
    includeNonPending = true,
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const statusFilter = includeNonPending ? "" : `AND LOWER(lr.status::text) = 'pending'`;
    const { rows } = await pool.query(
        `
          SELECT
            lr.id AS request_id,
            a.id AS assignment_id,
            a.doctor_id,
            h.full_name AS hospital_name,
            u.full_name AS doctor_name,
            'General' AS department_name,
            lr.leave_type,
            lr.start_date,
            lr.end_date,
            lr.start_time,
            lr.end_time,
            lr.reason,
            lr.status::text AS status,
            lr.created_at,
            lr.updated_at,
            lr.reviewed_at
          FROM leave_requests lr
          JOIN doctor_hospital_assignments a ON a.id = lr.assignment_id
          JOIN hospitals h ON h.id = a.hospital_id
          JOIN users u ON u.id = a.doctor_id
          WHERE a.doctor_id = $1
          ${statusFilter}
          ORDER BY lr.created_at DESC, lr.id DESC
        `,
        [normalizedDoctorId]
    );

    return rows.map(mapLeaveRequestRow);
};

export const createDoctorLeaveRequest = async ({
    doctorId,
    requesterId,
    assignmentId,
    leaveType = "full_day",
    startDate,
    endDate,
    startTime = null,
    endTime = null,
    reason = null,
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    if (normalizedDoctorId !== normalizedRequesterId) {
        const error = new Error("Not authorized to create leave requests for this doctor.");
        error.status = 403;
        throw error;
    }

    const normalizedLeaveType = String(leaveType || "full_day").trim().toLowerCase();
    if (normalizedLeaveType !== "full_day") {
        const error = new Error("Only full-day leave requests are supported at this time.");
        error.status = 400;
        throw error;
    }

    if (!String(startDate || "").trim() || !String(endDate || "").trim()) {
        const error = new Error("Start date and end date are required.");
        error.status = 400;
        throw error;
    }

    if (String(endDate) < String(startDate)) {
        const error = new Error("End date cannot be earlier than start date.");
        error.status = 400;
        throw error;
    }


    const assignment = await getAssignmentForDoctor({
        doctorId: normalizedDoctorId,
        assignmentId,
    });

    const { rows } = await pool.query(
        `
          INSERT INTO leave_requests (
            assignment_id,
            start_date,
            end_date,
            status,
            approver_id,
            reason,
            leave_type,
            start_time,
            end_time,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, 'pending', NULL, $4, $5, $6, $7, NOW(), NOW())
          RETURNING id
        `,
        [
            assignment.assignment_id,
            String(startDate).trim(),
            String(endDate).trim(),
            String(reason || "").trim() || null,
            normalizedLeaveType,
            normalizedLeaveType === "custom_hours" ? String(startTime).trim() : null,
            normalizedLeaveType === "custom_hours" ? String(endTime).trim() : null,
        ]
    );

    return {
        requestId: rows[0]?.id ?? null,
        requests: await getDoctorLeaveRequests({
            doctorId: normalizedDoctorId,
            includeNonPending: true,
        }),
    };
};

export const deleteDoctorLeaveRequest = async ({
    doctorId,
    requesterId,
    leaveId,
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const normalizedLeaveId = parsePositiveInt(leaveId, "Invalid leave request id.");

    if (normalizedDoctorId !== normalizedRequesterId) {
        const error = new Error("Not authorized to remove this leave request.");
        error.status = 403;
        throw error;
    }

    const { rowCount } = await pool.query(
        `
          DELETE FROM leave_requests lr
          USING doctor_hospital_assignments a
          WHERE lr.id = $1
            AND lr.assignment_id = a.id
            AND a.doctor_id = $2
            AND LOWER(lr.status::text) = 'pending'
        `,
        [normalizedLeaveId, normalizedDoctorId]
    );

    if (!rowCount) {
        const error = new Error("Leave request not found or can no longer be removed.");
        error.status = 404;
        throw error;
    }

    return {
        requests: await getDoctorLeaveRequests({
            doctorId: normalizedDoctorId,
            includeNonPending: true,
        }),
    };
};

export const createDoctorScheduleChangeRequest = async ({
    doctorId,
    requesterId,
    assignmentId,
    recurringSchedule = [],
    reason = null,
}) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const normalizedAssignmentId = parsePositiveInt(assignmentId, "Invalid assignment id.");

    if (normalizedDoctorId !== normalizedRequesterId) {
        const error = new Error("Not authorized to create schedule requests for this doctor.");
        error.status = 403;
        throw error;
    }

    await getAssignmentForDoctor({
        doctorId: normalizedDoctorId,
        assignmentId: normalizedAssignmentId,
    });

    const rows = (Array.isArray(recurringSchedule) ? recurringSchedule : [])
        .map((row) => ({
            assignment_id: Number.parseInt(row?.assignment_id ?? row?.assignmentId, 10),
            day_of_week: titleCase(row?.day_of_week ?? row?.dayOfWeek ?? ""),
            start_time: String(row?.start_time ?? row?.startTime ?? "").trim(),
            end_time: String(row?.end_time ?? row?.endTime ?? "").trim(),
            slot_interval_minutes: Math.max(5, Number.parseInt(row?.slot_interval_minutes ?? row?.slotIntervalMinutes, 10) || 20),
            effective_from: String(row?.effective_from ?? row?.effectiveFrom ?? "").trim() || null,
        }))
        .filter((row) => Number.isInteger(row.assignment_id) && row.assignment_id === normalizedAssignmentId);

    const duplicateGuard = new Set();
    for (const row of rows) {
        if (!row.day_of_week || !row.start_time || !row.end_time) {
            const error = new Error("Each schedule row must include day, start time, and end time.");
            error.status = 400;
            throw error;
        }
        if (row.end_time <= row.start_time) {
            const error = new Error("End time must be later than start time.");
            error.status = 400;
            throw error;
        }
        const key = `${row.assignment_id}:${row.day_of_week}`;
        if (duplicateGuard.has(key)) {
            const error = new Error(`Duplicate day found for assignment ${row.assignment_id}: ${row.day_of_week}`);
            error.status = 400;
            throw error;
        }
        duplicateGuard.add(key);
    }

    const effectiveFromCandidates = rows
        .map((row) => row.effective_from)
        .filter(Boolean)
        .sort((a, b) => String(a).localeCompare(String(b)));

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // CROSS-HOSPITAL VALIDATION: Check for clashes with other assignments and other pending requests
        await assertRequestedScheduleHasNoConflicts({
            doctorId: normalizedDoctorId,
            requestedSchedule: rows,
            excludeAssignmentId: normalizedAssignmentId,
        }, client);

        await client.query(
            `
              DELETE FROM schedule_change_requests
              WHERE assignment_id = $1
                AND LOWER(status::text) = 'pending'
            `,
            [normalizedAssignmentId]
        );

        const { rows: requestRows } = await client.query(
            `
              INSERT INTO schedule_change_requests (
                assignment_id,
                approver_id,
                effective_from,
                status,
                reason,
                reviewed_at,
                created_at,
                updated_at
              )
              VALUES ($1, NULL, $2, 'pending'::approval_status_enum, $3, NULL, NOW(), NOW())
              RETURNING id
            `,
            [
                normalizedAssignmentId,
                effectiveFromCandidates[0] || new Date().toISOString().slice(0, 10),
                String(reason || "").trim() || null,
            ]
        );

        const requestId = requestRows[0]?.id ?? null;
        for (const row of rows) {
            await client.query(
                `
                  INSERT INTO schedule_change_request_availability (
                    schedule_change_request_id,
                    day_of_week,
                    start_time,
                    end_time,
                    slot_interval_minutes,
                    created_at,
                    updated_at
                  )
                  VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                `,
                [
                    requestId,
                    row.day_of_week,
                    row.start_time,
                    row.end_time,
                    row.slot_interval_minutes,
                ]
            );
        }

        await client.query("COMMIT");
        return { requestId };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        console.error("Error creating schedule change request:", error);
        throw { status: 500, message: error.message || "Failed to create schedule change request." };
    } finally {
        client.release();
    }
};

export const getHospitalScheduleRequests = async ({
    requesterId,
    requesterRole,
    includeNonPending = true,
}) => {
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const hospitalContext = await getHospitalContextForUser({ userId: normalizedRequesterId });

    if (!hospitalContext) {
        const error = new Error("Hospital context not found for this account.");
        error.status = 404;
        throw error;
    }

    await assertHospitalReviewerAccess({
        reviewerId: normalizedRequesterId,
        reviewerRole: requesterRole,
        hospitalId: hospitalContext.hospital_id,
    });

    const statusFilter = includeNonPending ? "" : `AND LOWER(status::text) = 'pending'`;

    const { rows: leaveRows } = await pool.query(
        `
          SELECT
            lr.id AS request_id,
            a.id AS assignment_id,
            a.doctor_id,
            h.full_name AS hospital_name,
            u.full_name AS doctor_name,
            u.profile_picture AS doctor_profile_picture,
            lr.leave_type,
            lr.start_date,
            lr.end_date,
            lr.start_time,
            lr.end_time,
            lr.reason,
            lr.status::text AS status,
            lr.created_at,
            lr.updated_at,
            lr.reviewed_at
          FROM leave_requests lr
          JOIN doctor_hospital_assignments a ON a.id = lr.assignment_id
          JOIN hospitals h ON h.id = a.hospital_id
          JOIN users u ON u.id = a.doctor_id
          WHERE a.hospital_id = $1
          ${statusFilter}
          ORDER BY lr.created_at DESC, lr.id DESC
        `,
        [Number(hospitalContext.hospital_id)]
    );

    const { rows: scheduleRows } = await pool.query(
        `
          SELECT
            scr.id AS request_id,
            scr.assignment_id,
            a.doctor_id,
            h.full_name AS hospital_name,
            u.full_name AS doctor_name,
            u.profile_picture AS doctor_profile_picture,
            scr.effective_from,
            scr.reason,
            scr.status::text AS status,
            scr.created_at,
            scr.updated_at,
            scr.reviewed_at,
            COALESCE(
              JSON_AGG(
                JSON_BUILD_OBJECT(
                  'day_of_week', scra.day_of_week,
                  'start_time', scra.start_time,
                  'end_time', scra.end_time,
                  'slot_interval_minutes', scra.slot_interval_minutes
                )
                ORDER BY scra.day_of_week ASC, scra.start_time ASC
              ) FILTER (WHERE scra.id IS NOT NULL),
              '[]'::json
            ) AS requested_schedule
          FROM schedule_change_requests scr
          JOIN doctor_hospital_assignments a ON a.id = scr.assignment_id
          JOIN hospitals h ON h.id = a.hospital_id
          JOIN users u ON u.id = a.doctor_id
          LEFT JOIN schedule_change_request_availability scra
            ON scra.schedule_change_request_id = scr.id
          WHERE a.hospital_id = $1
          ${statusFilter}
          GROUP BY scr.id, scr.assignment_id, a.doctor_id, h.full_name, u.full_name, u.profile_picture
          ORDER BY scr.created_at DESC, scr.id DESC
        `,
        [Number(hospitalContext.hospital_id)]
    );

    const specializationMap = await getDoctorSpecializationMap({
        doctorIds: [
            ...leaveRows.map((row) => row.doctor_id),
            ...scheduleRows.map((row) => row.doctor_id),
        ],
    });

    const leaveRequests = leaveRows.map((row) => ({
        ...mapLeaveRequestRow(row),
        specialization_name: specializationMap.get(Number(row.doctor_id)) || "General Medicine",
    }));

    const scheduleRequests = scheduleRows.map((row) => ({
        ...mapScheduleChangeRequestRow(row),
        specialization_name: specializationMap.get(Number(row.doctor_id)) || "General Medicine",
    }));

    return [...leaveRequests, ...scheduleRequests].sort(
        (a, b) => Date.parse(String(b.created_at || "")) - Date.parse(String(a.created_at || ""))
    );
};

export const reviewHospitalScheduleRequest = async ({
    requestId,
    reviewerId,
    reviewerRole,
    requestType,
    decision,
}) => {
    const normalizedRequestId = parsePositiveInt(requestId, "Invalid request id.");
    const normalizedReviewerId = parsePositiveInt(reviewerId, "Invalid reviewer.");
    const normalizedDecision = normalizeApprovalDecision(decision);
    const normalizedRequestType = String(requestType || "").trim().toLowerCase();
    if (!["leave", "schedule_change"].includes(normalizedRequestType)) {
        const error = new Error("Invalid request type.");
        error.status = 400;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        if (normalizedRequestType === "leave") {
            const { rows } = await client.query(
                `
                  SELECT
                    lr.id,
                    lr.assignment_id,
                    lr.status::text AS status,
                    a.hospital_id
                  FROM leave_requests lr
                  JOIN doctor_hospital_assignments a ON a.id = lr.assignment_id
                  WHERE lr.id = $1
                  LIMIT 1
                  FOR UPDATE
                `,
                [normalizedRequestId]
            );

            const request = rows[0];
            if (!request) {
                const error = new Error("Leave request not found.");
                error.status = 404;
                throw error;
            }

            await assertHospitalReviewerAccess({
                reviewerId: normalizedReviewerId,
                reviewerRole,
                hospitalId: request.hospital_id,
            }, client);

            if (normalizeStatus(request.status) !== "pending") {
                const error = new Error("This leave request is no longer pending.");
                error.status = 409;
                throw error;
            }

            await client.query(
                `
                  UPDATE leave_requests
                  SET status = $1,
                      approver_id = $2,
                      reviewed_at = NOW(),
                      updated_at = NOW()
                  WHERE id = $3
                `,
                [normalizedDecision, normalizedReviewerId, request.id]
            );

            await client.query("COMMIT");
            return { requestId: request.id, status: normalizedDecision };
        }

        const { rows } = await client.query(
            `
              SELECT
                scr.id,
                scr.assignment_id,
                scr.status::text AS status,
                a.hospital_id
              FROM schedule_change_requests scr
              JOIN doctor_hospital_assignments a ON a.id = scr.assignment_id
              WHERE scr.id = $1
              LIMIT 1
              FOR UPDATE
            `,
            [normalizedRequestId]
        );

        const request = rows[0];
        if (!request) {
            const error = new Error("Schedule change request not found.");
            error.status = 404;
            throw error;
        }

        await assertHospitalReviewerAccess({
            reviewerId: normalizedReviewerId,
            reviewerRole,
            hospitalId: request.hospital_id,
        }, client);

        if (normalizeStatus(request.status) !== "pending") {
            const error = new Error("This schedule change request is no longer pending.");
            error.status = 409;
            throw error;
        }

        if (normalizedDecision === "approved") {
            const { rows: requestedRows } = await client.query(
                `
                  SELECT day_of_week, start_time, end_time, slot_interval_minutes
                  FROM schedule_change_request_availability
                  WHERE schedule_change_request_id = $1
                  ORDER BY day_of_week ASC, start_time ASC
                `,
                [request.id]
            );

            await client.query(
                `
                  DELETE FROM assignment_availability
                  WHERE assignment_id = $1
                `,
                [request.assignment_id]
            );

            for (const row of requestedRows) {
                await client.query(
                    `
                      INSERT INTO assignment_availability (
                        assignment_id,
                        day_of_week,
                        start_time,
                        end_time,
                        slot_interval_minutes
                      )
                      VALUES ($1, $2, $3, $4, $5)
                    `,
                    [
                        request.assignment_id,
                        row.day_of_week,
                        row.start_time,
                        row.end_time,
                        row.slot_interval_minutes,
                    ]
                );
            }
        }

        await client.query(
            `
              UPDATE schedule_change_requests
              SET status = $1,
                  approver_id = $2,
                  reviewed_at = NOW(),
                  updated_at = NOW()
              WHERE id = $3
            `,
            [normalizedDecision, normalizedReviewerId, request.id]
        );

        await client.query("COMMIT");
        return { requestId: request.id, status: normalizedDecision };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        console.error("Error reviewing hospital schedule request:", error);
        throw { status: 500, message: "Failed to review schedule request." };
    } finally {
        client.release();
    }
};

export const getDoctorAssignments = async ({ doctorId }) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const { rows } = await pool.query(
        `
          SELECT
            a.id AS assignment_id,
            a.hospital_id,
            h.full_name AS hospital_name,
            a.created_at
          FROM doctor_hospital_assignments a
          JOIN hospitals h ON h.id = a.hospital_id
          WHERE a.doctor_id = $1
          ORDER BY h.full_name ASC, a.id ASC
        `,
        [normalizedDoctorId]
    );
    return rows.map((row) => ({
        assignment_id: row.assignment_id,
        hospital_id: row.hospital_id,
        hospital_name: row.hospital_name || "Hospital",
        created_at: row.created_at,
    }));
};

export const removeDoctorHospitalAssignment = async ({ doctorId, requesterId, assignmentId }) => {
    const normalizedDoctorId = parsePositiveInt(doctorId, "Invalid doctor id.");
    const normalizedRequesterId = parsePositiveInt(requesterId, "Invalid requester.");
    const normalizedAssignmentId = parsePositiveInt(assignmentId, "Invalid assignment id.");

    const { rows: userRows } = await pool.query(
        "SELECT role FROM users WHERE id = $1 LIMIT 1",
        [normalizedRequesterId]
    );
    const role = userRows[0]?.role;
    const isAdmin = ['admin', 'super_admin', 'main super admin', 'main_super_admin'].includes(role);

    let isAuthorized = false;
    if (normalizedDoctorId === normalizedRequesterId || isAdmin) {
        isAuthorized = true;
    } else if (role === 'hospital') {
        const { rows: assignmentRows } = await pool.query(
            `SELECT a.hospital_id 
             FROM doctor_hospital_assignments a
             JOIN hospital_admin ha ON ha.hospital_id = a.hospital_id
             WHERE a.id = $1 AND ha.user_id = $2`,
            [normalizedAssignmentId, normalizedRequesterId]
        );
        if (assignmentRows.length > 0) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
        const error = new Error("Not authorized to remove this affiliation.");
        error.status = 403;
        throw error;
    }

    const { rows } = await pool.query(
        `SELECT id FROM doctor_hospital_assignments WHERE id = $1 AND doctor_id = $2 LIMIT 1`,
        [normalizedAssignmentId, normalizedDoctorId]
    );
    if (!rows.length) {
        const error = new Error("Affiliation not found.");
        error.status = 404;
        throw error;
    }

    await pool.query(
        `DELETE FROM doctor_hospital_assignments WHERE id = $1`,
        [normalizedAssignmentId]
    );

    return getDoctorAssignments({ doctorId: normalizedDoctorId });
};
