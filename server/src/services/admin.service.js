import pool from "../config/db.js";
import { parseJsonObject, titleCase as titleCaseLabel } from "../utils/helpers.js";

const mapAdminDoctorRow = (row = {}) => ({
    doctor_id: row.doctor_id,
    doctor_name: row.doctor_name || "Doctor",
    specialization_name: row.specialization_name || "General Medicine",
    doctor_email: row.doctor_email || "",
    doctor_phone: row.doctor_phone || "",
    affiliated_hospitals: row.affiliated_hospitals || "",
});

const mapAdminHospitalRow = (row = {}) => {
    const metadata = parseJsonObject(row.request_note);

    return {
        hospital_id: row.hospital_id,
        hospital_name: row.hospital_name || "Hospital",
        hospital_address: metadata.hospitalLocation || "",
        hospital_primary_email: row.hospital_primary_email || "",
        hospital_primary_phone: row.hospital_primary_phone || "",
        hospital_reception_phone: row.hospital_reception_phone || "",
        admin_contacts: row.admin_contacts || "",
        departments: Array.isArray(row.departments) ? row.departments.filter(Boolean) : [],
    };
};

const mapAdminUserRow = (row = {}) => ({
    user_id: row.user_id,
    full_name: row.full_name || "User",
    email: row.email || "",
    phone: row.phone || "",
    role: row.role || "",
    role_label: titleCaseLabel(row.role || ""),
    status: row.status || "",
    specialization_name: row.specialization_name || "",
    hospital_name: row.hospital_name || "",
    created_at: row.created_at || null,
});

export const getAdminUsers = async () => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                u.id AS user_id,
                u.full_name,
                u.email,
                u.phone,
                u.role::text AS role,
                u.status::text AS status,
                u.created_at,
                COALESCE(spec.specialization_name, '') AS specialization_name,
                COALESCE(
                  doctor_affiliations.hospital_name,
                  admin_hospitals.hospital_name,
                  ''
                ) AS hospital_name
              FROM users u
              LEFT JOIN doctors d ON d.id = u.id
              LEFT JOIN LATERAL (
                SELECT STRING_AGG(name, ', ' ORDER BY name) AS specialization_name
                FROM (
                  SELECT DISTINCT s.name
                  FROM doctor_specializations ds
                  JOIN specializations s ON s.id = ds.specialization_id
                  WHERE ds.doctor_id = d.id
                ) specialization_rows
              ) spec ON TRUE
              LEFT JOIN LATERAL (
                SELECT STRING_AGG(full_name, ', ' ORDER BY full_name) AS hospital_name
                FROM (
                  SELECT DISTINCT h.full_name
                  FROM doctor_hospital_assignments dha
                  JOIN hospitals h ON h.id = dha.hospital_id
                  WHERE dha.doctor_id = d.id
                ) hospital_rows
              ) doctor_affiliations ON TRUE
              LEFT JOIN LATERAL (
                SELECT STRING_AGG(full_name, ', ' ORDER BY full_name) AS hospital_name
                FROM (
                  SELECT DISTINCT h.full_name
                  FROM hospital_admin ha
                  JOIN hospitals h ON h.id = ha.hospital_id
                  WHERE ha.user_id = u.id
                ) hospital_rows
              ) admin_hospitals ON TRUE
              ORDER BY u.created_at DESC, u.id DESC
            `
        );

        return rows.map(mapAdminUserRow);
    } catch (error) {
        console.error("Error fetching admin users:", error);
        const err = new Error("Failed to fetch users.");
        err.status = 500;
        throw err;
    }
};

export const getAdminDoctors = async () => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                d.id AS doctor_id,
                u.full_name AS doctor_name,
                u.email AS doctor_email,
                u.phone AS doctor_phone,
                COALESCE(spec.specialization_name, 'General Medicine') AS specialization_name,
                COALESCE(aff.affiliated_hospitals, '') AS affiliated_hospitals
              FROM doctors d
              JOIN users u ON u.id = d.id
              LEFT JOIN LATERAL (
                SELECT STRING_AGG(specialization_name, ', ' ORDER BY specialization_name) AS specialization_name
                FROM (
                  SELECT DISTINCT s.name AS specialization_name
                  FROM doctor_specializations ds
                  JOIN specializations s ON s.id = ds.specialization_id
                  WHERE ds.doctor_id = d.id
                ) specialization_rows
              ) spec ON TRUE
              LEFT JOIN LATERAL (
                SELECT STRING_AGG(hospital_name, ', ' ORDER BY hospital_name) AS affiliated_hospitals
                FROM (
                  SELECT DISTINCT h.full_name AS hospital_name
                  FROM doctor_hospital_assignments a
                  JOIN hospitals h ON h.id = a.hospital_id
                  WHERE a.doctor_id = d.id
                ) hospital_rows
              ) aff ON TRUE
              ORDER BY u.full_name ASC, d.id ASC
            `
        );

        return rows.map(mapAdminDoctorRow);
    } catch (error) {
        console.error("Error fetching admin doctors:", error);
        const err = new Error("Failed to fetch doctor directory.");
        err.status = 500;
        throw err;
    }
};

export const getAdminHospitals = async () => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                h.id AS hospital_id,
                h.full_name AS hospital_name,
                h.primary_email AS hospital_primary_email,
                h.primary_phone AS hospital_primary_phone,
                h.reception_phone AS hospital_reception_phone,
                req.request_note,
                COALESCE(dep.departments, ARRAY[]::text[]) AS departments,
                COALESCE(admins.admin_contacts, '') AS admin_contacts
              FROM hospitals h
              LEFT JOIN LATERAL (
                SELECT request_note
                FROM hospital_requests hr
                WHERE hr.registration_number = h.registration_number
                ORDER BY hr.created_at DESC, hr.id DESC
                LIMIT 1
              ) req ON TRUE
              LEFT JOIN LATERAL (
                SELECT ARRAY_AGG(department_name ORDER BY department_name) AS departments
                FROM (
                  SELECT DISTINCT d.name AS department_name
                  FROM hospital_departments hd
                  JOIN departments d ON d.id = hd.department_id
                  WHERE hd.hospital_id = h.id
                ) department_rows
              ) dep ON TRUE
              LEFT JOIN LATERAL (
                SELECT STRING_AGG(admin_contact, ' | ' ORDER BY admin_contact) AS admin_contacts
                FROM (
                  SELECT DISTINCT
                    CONCAT(
                      COALESCE(u.full_name, 'Admin'),
                      CASE
                        WHEN COALESCE(u.email, '') <> '' OR COALESCE(u.phone, '') <> ''
                          THEN ' (' || CONCAT_WS(', ', NULLIF(u.email, ''), NULLIF(u.phone, '')) || ')'
                        ELSE ''
                      END
                    ) AS admin_contact
                  FROM hospital_admin ha
                  JOIN users u ON u.id = ha.user_id
                  WHERE ha.hospital_id = h.id
                ) admin_rows
              ) admins ON TRUE
              ORDER BY h.full_name ASC, h.id ASC
            `
        );

        return rows.map(mapAdminHospitalRow);
    } catch (error) {
        console.error("Error fetching admin hospitals:", error);
        const err = new Error("Failed to fetch hospital directory.");
        err.status = 500;
        throw err;
    }
};
export const getAdminDoctorRequests = async () => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                dr.id AS request_id,
                dr.full_name AS doctor_name,
                dr.email AS doctor_email,
                dr.phone AS doctor_phone,
                dr.date_of_birth::text AS doctor_date_of_birth,
                dr.gender::text AS doctor_gender,
                dr.address AS doctor_address,
                dr.description AS doctor_description,
                dr.experience_years AS doctor_experience_years,
                dr.license_number AS doctor_license_number,
                dr.approval_status::text AS request_status,
                dr.created_at,
                COALESCE(spec.specializations, '[]'::json) AS specializations,
                COALESCE(qual.qualifications, '[]'::json) AS qualifications,
                COALESCE(exp.experiences, '[]'::json) AS experiences,
                COALESCE(doc.verification_documents, '[]'::json) AS verification_documents
              FROM doctor_requests dr
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(specialization_name ORDER BY specialization_name) AS specializations
                FROM (
                  SELECT DISTINCT s.name AS specialization_name
                  FROM doctor_request_specializations drs
                  JOIN specializations s ON s.id = drs.specialization_id
                  WHERE drs.request_id = dr.id
                ) specialization_rows
              ) spec ON TRUE
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', drq.id,
                    'degree_name', drq.degree_name,
                    'institution', drq.institution,
                    'graduation_date', drq.graduation_date::text
                  )
                  ORDER BY drq.graduation_date DESC, drq.id DESC
                ) AS qualifications
                FROM doctor_request_qualifications drq
                WHERE drq.request_id = dr.id
              ) qual ON TRUE
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', dre.id,
                    'organization', dre.organization,
                    'position', dre.position,
                    'start_date', dre.start_date::text,
                    'end_date', dre.end_date::text
                  )
                  ORDER BY dre.start_date DESC, dre.id DESC
                ) AS experiences
                FROM doctor_request_experience dre
                WHERE dre.request_id = dr.id
              ) exp ON TRUE
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
                WHERE vd.doctor_request_id = dr.id
              ) doc ON TRUE
              ORDER BY dr.created_at DESC, dr.id DESC
            `
        );

        return rows;
    } catch (error) {
        console.error("Error fetching admin doctor requests:", error);
        const err = new Error("Failed to fetch doctor requests.");
        err.status = 500;
        throw err;
    }
};

export const getAdminHospitalRequests = async () => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                hr.id AS request_id,
                hr.full_name AS hospital_name,
                hr.description AS hospital_description,
                hr.registration_number,
                hr.primary_email AS hospital_primary_email,
                hr.primary_phone AS hospital_primary_phone,
                hr.alternate_email AS hospital_alternate_email,
                hr.alternate_phone AS hospital_alternate_phone,
                hr.reception_phone AS hospital_reception_phone,
                hr.alternate_reception_phone AS hospital_alternate_reception_phone,
                hr.website AS hospital_website,
                hr.hospital_type::text AS hospital_type,
                hr.approval_status::text AS request_status,
                hr.created_at,
                hr.request_note,
                hra.full_name AS admin_name,
                hra.email AS admin_email,
                hra.phone AS admin_phone,
                hra.date_of_birth::text AS admin_date_of_birth,
                hra.gender::text AS admin_gender,
                hra.address AS admin_address,
                COALESCE(dep.departments, '[]'::json) AS departments,
                COALESCE(fac.facilities, '[]'::json) AS facilities,
                COALESCE(doc.verification_documents, '[]'::json) AS verification_documents
              FROM hospital_requests hr
              LEFT JOIN hospital_request_admin hra ON hra.request_id = hr.id
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(department_name ORDER BY department_name) AS departments
                FROM (
                  SELECT DISTINCT d.name AS department_name
                  FROM hospital_request_departments hrd
                  JOIN departments d ON d.id = hrd.department_id
                  WHERE hrd.request_id = hr.id
                ) department_rows
              ) dep ON TRUE
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(facility_name ORDER BY facility_name) AS facilities
                FROM (
                  SELECT DISTINCT f.name AS facility_name
                  FROM hospital_request_facilities hrf
                  JOIN facilities f ON f.id = hrf.facility_id
                  WHERE hrf.request_id = hr.id
                ) facility_rows
              ) fac ON TRUE
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
                WHERE vd.hospital_request_id = hr.id
              ) doc ON TRUE
              ORDER BY hr.created_at DESC, hr.id DESC
            `
        );

        return rows.map(row => {
            const metadata = parseJsonObject(row.request_note);
            return {
                ...row,
                hospital_address: metadata.hospitalLocation || "",
                hospital_map_url: metadata.hospitalMapURL || "",
                hospital_established_year: metadata.yearEstablished || null,
                hospital_license_authority: metadata.licenseAuthority || "",
                hospital_opening_time: metadata.openingTime || "",
                hospital_closing_time: metadata.closingTime || "",
                hospital_days_open: Array.isArray(metadata.daysOpen) ? metadata.daysOpen : [],
                hospital_emergency_services: metadata.emergencyServices || false,
                hospital_type_label: metadata.hospitalTypeLabel || (row.hospital_type ? row.hospital_type.charAt(0).toUpperCase() + row.hospital_type.slice(1) : ""),
            };
        });
    } catch (error) {
        console.error("Error fetching admin hospital requests:", error);
        const err = new Error("Failed to fetch hospital requests.");
        err.status = 500;
        throw err;
    }
};

export const getAdminDoctorRequestById = async (requestId) => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                dr.id AS request_id,
                dr.full_name AS doctor_name,
                dr.email AS doctor_email,
                dr.phone AS doctor_phone,
                dr.date_of_birth::text AS doctor_date_of_birth,
                dr.gender::text AS doctor_gender,
                dr.address AS doctor_address,
                dr.description AS doctor_description,
                dr.experience_years AS doctor_experience_years,
                dr.license_number AS doctor_license_number,
                dr.approval_status::text AS request_status,
                dr.created_at,
                COALESCE(spec.specializations, '[]'::json) AS specializations,
                COALESCE(qual.qualifications, '[]'::json) AS qualifications,
                COALESCE(exp.experiences, '[]'::json) AS experiences,
                COALESCE(doc.verification_documents, '[]'::json) AS verification_documents
              FROM doctor_requests dr
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(specialization_name ORDER BY specialization_name) AS specializations
                FROM (
                  SELECT DISTINCT s.name AS specialization_name
                  FROM doctor_request_specializations drs
                  JOIN specializations s ON s.id = drs.specialization_id
                  WHERE drs.request_id = dr.id
                ) specialization_rows
              ) spec ON TRUE
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', drq.id,
                    'degree_name', drq.degree_name,
                    'institution', drq.institution,
                    'graduation_date', drq.graduation_date::text
                  )
                  ORDER BY drq.graduation_date DESC, drq.id DESC
                ) AS qualifications
                FROM doctor_request_qualifications drq
                WHERE drq.request_id = dr.id
              ) qual ON TRUE
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', dre.id,
                    'organization', dre.organization,
                    'position', dre.position,
                    'start_date', dre.start_date::text,
                    'end_date', dre.end_date::text
                  )
                  ORDER BY dre.start_date DESC, dre.id DESC
                ) AS experiences
                FROM doctor_request_experience dre
                WHERE dre.request_id = dr.id
              ) exp ON TRUE
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
                WHERE vd.doctor_request_id = dr.id
              ) doc ON TRUE
              WHERE dr.id = $1
            `,
            [requestId]
        );

        if (rows.length === 0) {
            const err = new Error("Doctor request not found.");
            err.status = 404;
            throw err;
        }

        return rows[0];
    } catch (error) {
        console.error(`Error fetching admin doctor request ${requestId}:`, error);
        if (error.status) throw error;
        const err = new Error("Failed to fetch doctor request.");
        err.status = 500;
        throw err;
    }
};

export const getAdminHospitalRequestById = async (requestId) => {
    try {
        const { rows } = await pool.query(
            `
              SELECT
                hr.id AS request_id,
                hr.full_name AS hospital_name,
                hr.description AS hospital_description,
                hr.registration_number,
                hr.primary_email AS hospital_primary_email,
                hr.primary_phone AS hospital_primary_phone,
                hr.alternate_email AS hospital_alternate_email,
                hr.alternate_phone AS hospital_alternate_phone,
                hr.reception_phone AS hospital_reception_phone,
                hr.alternate_reception_phone AS hospital_alternate_reception_phone,
                hr.website AS hospital_website,
                hr.hospital_type::text AS hospital_type,
                hr.approval_status::text AS request_status,
                hr.created_at,
                hr.request_note,
                hra.full_name AS admin_name,
                hra.email AS admin_email,
                hra.phone AS admin_phone,
                hra.date_of_birth::text AS admin_date_of_birth,
                hra.gender::text AS admin_gender,
                hra.address AS admin_address,
                COALESCE(dep.departments, '[]'::json) AS departments,
                COALESCE(fac.facilities, '[]'::json) AS facilities,
                COALESCE(doc.verification_documents, '[]'::json) AS verification_documents
              FROM hospital_requests hr
              LEFT JOIN hospital_request_admin hra ON hra.request_id = hr.id
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(department_name ORDER BY department_name) AS departments
                FROM (
                  SELECT DISTINCT d.name AS department_name
                  FROM hospital_request_departments hrd
                  JOIN departments d ON d.id = hrd.department_id
                  WHERE hrd.request_id = hr.id
                ) department_rows
              ) dep ON TRUE
              LEFT JOIN LATERAL (
                SELECT JSON_AGG(facility_name ORDER BY facility_name) AS facilities
                FROM (
                  SELECT DISTINCT f.name AS facility_name
                  FROM hospital_request_facilities hrf
                  JOIN facilities f ON f.id = hrf.facility_id
                  WHERE hrf.request_id = hr.id
                ) facility_rows
              ) fac ON TRUE
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
                WHERE vd.hospital_request_id = hr.id
              ) doc ON TRUE
              WHERE hr.id = $1
            `,
            [requestId]
        );

        if (rows.length === 0) {
            const err = new Error("Hospital request not found.");
            err.status = 404;
            throw err;
        }

        const row = rows[0];
        const metadata = parseJsonObject(row.request_note);
        return {
            ...row,
            hospital_address: metadata.hospitalLocation || "",
            hospital_map_url: metadata.hospitalMapURL || "",
            hospital_established_year: metadata.yearEstablished || null,
            hospital_license_authority: metadata.licenseAuthority || "",
            hospital_opening_time: metadata.openingTime || "",
            hospital_closing_time: metadata.closingTime || "",
            hospital_days_open: Array.isArray(metadata.daysOpen) ? metadata.daysOpen : [],
            hospital_emergency_services: metadata.emergencyServices || false,
            hospital_type_label: metadata.hospitalTypeLabel || (row.hospital_type ? row.hospital_type.charAt(0).toUpperCase() + row.hospital_type.slice(1) : ""),
        };

    } catch (error) {
        console.error(`Error fetching admin hospital request ${requestId}:`, error);
        if (error.status) throw error;
        const err = new Error("Failed to fetch hospital request.");
        err.status = 500;
        throw err;
    }
};
export const getAdminStats = async () => {
    try {
        // 1. Core Summary Metrics
        const summaryRes = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM users) as total_users,
                (SELECT COUNT(*) FROM doctors) as total_doctors,
                (SELECT COUNT(*) FROM hospitals) as total_hospitals,
                (SELECT COUNT(*) FROM appointments) as total_appointments,
                (SELECT COUNT(*) FROM doctor_requests WHERE approval_status = 'pending') as pending_doctor_requests,
                (SELECT COUNT(*) FROM hospital_requests WHERE approval_status = 'pending') as pending_hospital_requests
        `);

        // 2. User Role Distribution
        const roleDistRes = await pool.query(`
            SELECT role::text, COUNT(*) as count
            FROM users
            GROUP BY role
        `);

        // 3. User Growth (Last 30 Days)
        const userGrowthRes = await pool.query(`
            SELECT 
                d.day::date as date,
                COUNT(u.id) as count
            FROM (
                SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')::date as day
            ) d
            LEFT JOIN users u ON u.created_at::date = d.day
            GROUP BY d.day
            ORDER BY d.day ASC
        `);

        // 4. Appointment Trends (Last 30 Days)
        const apptTrendsRes = await pool.query(`
            SELECT 
                d.day::date as date,
                COUNT(a.id) as count
            FROM (
                SELECT generate_series(CURRENT_DATE - INTERVAL '29 days', CURRENT_DATE, '1 day')::date as day
            ) d
            LEFT JOIN appointments a ON a.created_at::date = d.day
            GROUP BY d.day
            ORDER BY d.day ASC
        `);

        // 5. Top Hospitals (by total appointments)
        const topHospitalsRes = await pool.query(`
            SELECT
                h.id,
                h.full_name as name,
                COUNT(a.id) as appointment_count
            FROM hospitals h
            LEFT JOIN appointments a ON a.hospital_id = h.id
            GROUP BY h.id, h.full_name
            ORDER BY appointment_count DESC
            LIMIT 6
        `);

        // 6. Recent Activity (Recent Requests)
        const recentDoctorRequests = await pool.query(`
            SELECT id, full_name, created_at, approval_status::text as status
            FROM doctor_requests
            ORDER BY created_at DESC
            LIMIT 5
        `);

        const recentHospitalRequests = await pool.query(`
            SELECT id, full_name, created_at, approval_status::text as status
            FROM hospital_requests
            ORDER BY created_at DESC
            LIMIT 5
        `);

        // 7. Appointment status breakdown
        const apptStatusRes = await pool.query(`
            SELECT status::text, COUNT(*) as count
            FROM appointments
            GROUP BY status
        `);

        // 8. Doctor & hospital request status breakdown
        const doctorRequestStatusRes = await pool.query(`
            SELECT approval_status::text as status, COUNT(*) as count
            FROM doctor_requests
            GROUP BY approval_status
        `);

        const hospitalRequestStatusRes = await pool.query(`
            SELECT approval_status::text as status, COUNT(*) as count
            FROM hospital_requests
            GROUP BY approval_status
        `);

        // 9. Appointments this week vs last week
        const weeklyApptRes = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days') AS last_week
            FROM appointments
        `);

        // 10. New users this week vs last week
        const weeklyUsersRes = await pool.query(`
            SELECT
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') AS this_week,
                COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days') AS last_week
            FROM users
        `);

        return {
            summary: summaryRes.rows[0],
            roleDistribution: roleDistRes.rows,
            userGrowth: userGrowthRes.rows,
            appointmentTrends: apptTrendsRes.rows,
            topHospitals: topHospitalsRes.rows,
            recentRequests: {
                doctors: recentDoctorRequests.rows,
                hospitals: recentHospitalRequests.rows
            },
            appointmentStatusBreakdown: apptStatusRes.rows,
            doctorRequestStatus: doctorRequestStatusRes.rows,
            hospitalRequestStatus: hospitalRequestStatusRes.rows,
            weeklyAppointments: weeklyApptRes.rows[0],
            weeklyUsers: weeklyUsersRes.rows[0],
        };
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        throw { status: 500, message: "Failed to load admin statistics." };
    }
};

export const deleteAdminDoctor = async (doctorId) => {
    const id = Number.parseInt(doctorId, 10);
    if (!Number.isInteger(id)) {
        const error = new Error("Invalid doctor ID.");
        error.status = 400;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { rows: assignments } = await client.query(
            "SELECT id FROM doctor_hospital_assignments WHERE doctor_id = $1",
            [id]
        );
        const assignmentIds = assignments.map(a => a.id);

        if (assignmentIds.length > 0) {
            await client.query("DELETE FROM assignment_availability WHERE assignment_id = ANY($1)", [assignmentIds]);
            await client.query("DELETE FROM leave_requests WHERE assignment_id = ANY($1)", [assignmentIds]);
            await client.query("DELETE FROM schedule_change_requests WHERE assignment_id = ANY($1)", [assignmentIds]);
            await client.query("DELETE FROM doctor_hospital_assignments WHERE doctor_id = $1", [id]);
        }

        await client.query("DELETE FROM doctor_affiliation_requests WHERE doctor_id = $1", [id]);
        await client.query("DELETE FROM doctor_specializations WHERE doctor_id = $1", [id]);
        await client.query("DELETE FROM doctor_qualifications WHERE doctor_id = $1", [id]);
        await client.query("DELETE FROM doctor_experience WHERE doctor_id = $1", [id]);
        await client.query("DELETE FROM reviews WHERE doctor_id = $1", [id]);
        await client.query("DELETE FROM appointments WHERE doctor_id = $1", [id]);
        await client.query("DELETE FROM doctors WHERE id = $1", [id]);
        await client.query("DELETE FROM users WHERE id = $1", [id]);

        await client.query("COMMIT");
        return { success: true, message: "Doctor deleted successfully." };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error deleting doctor:", error);
        throw { status: 500, message: error.message || "Failed to delete doctor." };
    } finally {
        client.release();
    }
};

export const deleteAdminHospital = async (hospitalId) => {
    const id = Number.parseInt(hospitalId, 10);
    if (!Number.isInteger(id)) {
        const error = new Error("Invalid hospital ID.");
        error.status = 400;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { rows: assignments } = await client.query(
            "SELECT id FROM doctor_hospital_assignments WHERE hospital_id = $1",
            [id]
        );
        const assignmentIds = assignments.map(a => a.id);

        if (assignmentIds.length > 0) {
            await client.query("DELETE FROM assignment_availability WHERE assignment_id = ANY($1)", [assignmentIds]);
            await client.query("DELETE FROM leave_requests WHERE assignment_id = ANY($1)", [assignmentIds]);
            await client.query("DELETE FROM schedule_change_requests WHERE assignment_id = ANY($1)", [assignmentIds]);
            await client.query("DELETE FROM doctor_hospital_assignments WHERE hospital_id = $1", [id]);
        }

        await client.query("DELETE FROM doctor_affiliation_requests WHERE hospital_id = $1", [id]);
        await client.query("DELETE FROM hospital_admin WHERE hospital_id = $1", [id]);
        await client.query("DELETE FROM hospital_departments WHERE hospital_id = $1", [id]);
        await client.query("DELETE FROM hospital_facilities WHERE hospital_id = $1", [id]);
        await client.query("DELETE FROM reviews WHERE hospital_id = $1", [id]);
        await client.query("DELETE FROM appointments WHERE hospital_id = $1", [id]);
        await client.query("DELETE FROM hospitals WHERE id = $1", [id]);

        await client.query("COMMIT");
        return { success: true, message: "Hospital deleted successfully." };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error deleting hospital:", error);
        throw { status: 500, message: error.message || "Failed to delete hospital." };
    } finally {
        client.release();
    }
};
