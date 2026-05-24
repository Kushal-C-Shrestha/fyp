import bcrypt from "bcrypt";
import dotenv from "dotenv";
import pool from "../config/db.js";
import { parseJson, stringifyJson } from "./schedule.shared.js";
import { createNotification } from "./notification.service.js";
import { sendApprovalEmail, sendRejectionEmail } from "./email.service.js";
import { titleCase } from "../utils/helpers.js";

dotenv.config();

const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || "10", 10);

const hospitalTypeToEnum = (value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    if (normalized === "government") return "government";
    if (normalized === "community" || normalized === "teaching") return "community";
    return "private";
};

const normalizeArrayInput = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || "").trim()).filter(Boolean);
    }

    if (value === null || value === undefined) return [];

    const raw = String(value).trim();
    if (!raw) return [];

    if (raw.startsWith("[") && raw.endsWith("]")) {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed)
                ? parsed.map((item) => String(item || "").trim()).filter(Boolean)
                : [];
        } catch {
            return raw.split(",").map((item) => item.trim()).filter(Boolean);
        }
    }

    return raw.split(",").map((item) => item.trim()).filter(Boolean);
};

const isNonEmptyString = (value) => String(value || "").trim().length > 0;

const mapHospitalRow = (row = {}) => {
    return {
        hospital_id: row.hospital_id,
        hospital_name: row.hospital_name,
        hospital_image: row.hospital_image || "",
        hospital_address: String(row.address || row.hospital_address || "").trim(),
        hospital_map_url: row.map_url || "",
        hospital_description: row.hospital_description || "",
        hospital_type: row.hospital_type_label || row.hospital_type || "Hospital",
        hospital_website: row.hospital_website || "",
        hospital_established_year: row.established_year || null,
        hospital_license_authority: row.license_authority || "",
        hospital_primary_email: row.hospital_primary_email || "",
        hospital_primary_phone: row.hospital_primary_phone || "",
        hospital_reception_phone: row.hospital_reception_phone || "",
        hospital_alternate_email: row.hospital_alternate_email || "",
        hospital_alternate_phone: row.hospital_alternate_phone || "",
        hospital_alternate_reception_phone: row.hospital_alternate_reception_phone || "",
        departments: Array.isArray(row.departments) ? row.departments.filter(Boolean) : [],
        facilities: Array.isArray(row.facilities) ? row.facilities.filter(Boolean) : [],
        avg_rating: Number(row.avg_rating || 0),
        review_count: Number(row.review_count || 0),
        request_note: row.request_note || null,
        status: row.status || "active",
        created_at: row.created_at || null,
        updated_at: row.updated_at || null,
    };
};

const normalizeObjectArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const ensureLookupIds = async ({ tableName, names = [], client }) => {
    const cleanNames = [...new Set((Array.isArray(names) ? names : []).map((item) => String(item || "").trim()).filter(Boolean))];
    if (!cleanNames.length) return [];

    const ids = [];
    for (const name of cleanNames) {
        const { rows } = await client.query(
            `
              INSERT INTO ${tableName} (name)
              VALUES ($1)
              ON CONFLICT (name)
              DO UPDATE SET name = EXCLUDED.name
              RETURNING id
            `,
            [name]
        );
        if (rows[0]?.id) ids.push(rows[0].id);
    }

    return ids;
};

const insertVerificationDocuments = async ({
    client,
    requestType,
    hospitalRequestId = null,
    doctorRequestId = null,
    userId = null,
    filesByCategory = {},
}) => {
    const entries = Object.entries(filesByCategory);
    for (const [documentType, fileList] of entries) {
        for (const file of Array.isArray(fileList) ? fileList : []) {
            await client.query(
                `
                  INSERT INTO verification_documents (
                    request_type,
                    doctor_request_id,
                    hospital_request_id,
                    user_id,
                    document_type,
                    document_url,
                    file_name,
                    file_size,
                    mime_type,
                    status
                  )
                  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
                `,
                [
                    requestType,
                    doctorRequestId,
                    hospitalRequestId,
                    userId,
                    documentType,
                    file?.location || file?.path || file?.url || "",
                    file?.originalname || file?.name || "",
                    String(file?.size || ""),
                    file?.mimetype || "",
                ]
            );
        }
    }
};

const getHospitalListQuery = (whereClause = "1=1") => `
    SELECT
      h.id AS hospital_id,
      h.full_name AS hospital_name,
      h.description AS hospital_description,
      h.registration_number,
      h.primary_email AS hospital_primary_email,
      h.primary_phone AS hospital_primary_phone,
      h.reception_phone AS hospital_reception_phone,
      h.alternate_email AS hospital_alternate_email,
      h.alternate_phone AS hospital_alternate_phone,
      h.alternate_reception_phone AS hospital_alternate_reception_phone,
      h.website AS hospital_website,
      h.hospital_type::text AS hospital_type,
      h.profile_picture AS hospital_image,
      h.address,
      h.map_url,
      h.established_year,
      h.license_authority,
      h.opening_time,
      h.closing_time,
      h.days_open,
      h.emergency_services,
      h.hospital_type_label,
      h.status::text AS status,
      h.created_at,
      h.updated_at,
      req.request_note,
      COALESCE(dep.departments, ARRAY[]::text[]) AS departments,
      COALESCE(fac.facilities, ARRAY[]::text[]) AS facilities,
      COALESCE(review_data.avg_rating, 0) AS avg_rating,
      COALESCE(review_data.review_count, 0) AS review_count
    FROM hospitals h
    LEFT JOIN LATERAL (
      SELECT request_note
      FROM hospital_requests hr
      WHERE hr.registration_number = h.registration_number
      ORDER BY hr.created_at DESC, hr.id DESC
      LIMIT 1
    ) req ON TRUE
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(DISTINCT d.name ORDER BY d.name) AS departments
      FROM hospital_departments hd
      JOIN departments d ON d.id = hd.department_id
      WHERE hd.hospital_id = h.id
    ) dep ON TRUE
    LEFT JOIN LATERAL (
      SELECT ARRAY_AGG(DISTINCT f.name ORDER BY f.name) AS facilities
      FROM hospital_facilities hf
      JOIN facilities f ON f.id = hf.facility_id
      WHERE hf.hospital_id = h.id
    ) fac ON TRUE
    LEFT JOIN LATERAL (
      SELECT
        ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
        COUNT(r.id) AS review_count
      FROM reviews r
      WHERE r.hospital_id = h.id
    ) review_data ON TRUE
    WHERE ${whereClause}
`;

export const getAllHospitals = async () => {
    try {
        const { rows } = await pool.query(
            `${getHospitalListQuery("LOWER(COALESCE(h.status::text, 'active')) = 'active'")}
             ORDER BY h.full_name ASC`
        );
        return rows.map(mapHospitalRow);
    } catch (error) {
        console.error("Error fetching hospitals:", error);
        const err = new Error("Some error occured");
        err.status = 500;
        throw err;
    }
};

export const getHospitalById = async (id) => {
    const normalizedId = Number.parseInt(id, 10);
    if (!Number.isInteger(normalizedId)) {
        const error = new Error("The id is not given");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `${getHospitalListQuery("h.id = $1")}
             LIMIT 1`,
            [normalizedId]
        );

        if (!rows.length) {
            const error = new Error("The hospital with that id does not exist.");
            error.status = 404;
            throw error;
        }

        return mapHospitalRow(rows[0]);
    } catch (error) {
        if (error?.status) throw error;
        const err = new Error("Some error occured");
        err.status = 500;
        throw err;
    }
};

export const getMyHospitalContext = async ({ userId }) => {
    const normalizedUserId = Number.parseInt(userId, 10);
    if (!Number.isInteger(normalizedUserId)) {
        const error = new Error("Invalid user id.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
              SELECT
                h.id AS hospital_id,
                h.full_name AS hospital_name,
                h.description AS hospital_description,
                h.hospital_type::text AS hospital_type,
                h.primary_email AS hospital_primary_email,
                h.primary_phone AS hospital_primary_phone,
                h.profile_picture AS hospital_image,
                h.registration_number,
                h.address,
                h.map_url,
                h.established_year,
                h.license_authority,
                h.opening_time,
                h.closing_time,
                h.days_open,
                h.emergency_services,
                h.hospital_type_label,
                req.request_note,
                COALESCE(review_data.avg_rating, 0) AS avg_rating,
                COALESCE(review_data.review_count, 0) AS review_count
              FROM hospital_admin ha
              JOIN hospitals h ON h.id = ha.hospital_id
              LEFT JOIN LATERAL (
                SELECT request_note
                FROM hospital_requests hr
                WHERE hr.registration_number = h.registration_number
                ORDER BY hr.created_at DESC, hr.id DESC
                LIMIT 1
              ) req ON TRUE
              LEFT JOIN LATERAL (
                SELECT
                  ROUND(AVG(r.rating)::numeric, 2) AS avg_rating,
                  COUNT(r.id) AS review_count
                FROM reviews r
                WHERE r.hospital_id = h.id
              ) review_data ON TRUE
              WHERE ha.user_id = $1
              LIMIT 1
            `,
            [normalizedUserId]
        );

        if (!rows.length) {
            const error = new Error("Hospital context not found for this account.");
            error.status = 404;
            throw error;
        }

        return mapHospitalRow(rows[0]);
    } catch (error) {
        if (error?.status) throw error;
        const err = new Error("Some error occured");
        err.status = 500;
        throw err;
    }
};

export const registerHospitalRequest = async ({ body, files }) => {
    const client = await pool.connect();

    try {
        const hospitalName = String(body?.hospitalName || "").trim();
        const hospitalDescription = String(body?.hospitalDescription || "").trim();
        const registrationNumber = String(body?.registrationNumber || "").trim();
        const primaryEmail = String(body?.primaryEmail || "").trim().toLowerCase();
        const primaryPhone = String(body?.primaryPhone || "").trim();
        const alternateEmail = String(body?.alternateEmail || "").trim().toLowerCase() || null;
        const alternatePhone = String(body?.alternatePhone || "").trim() || null;
        const receptionPhone = String(body?.receptionNumber || "").trim();
        const website = String(body?.websiteURL || "").trim() || null;
        const hospitalTypeLabel = String(body?.hospitalType || "").trim();
        const hospitalType = hospitalTypeToEnum(hospitalTypeLabel);

        const adminName = String(body?.adminName || "").trim();
        const adminEmail = String(body?.adminEmail || "").trim().toLowerCase();
        const adminPhone = String(body?.adminPhone || "").trim();
        const adminDob = String(body?.adminDob || "").trim();
        const adminGender = String(body?.adminGender || "other").trim().toLowerCase();
        const adminPassword = String(body?.adminPassword || "");
        const adminConfirmPassword = String(body?.adminConfirmPassword || "");

        const medicalDepartments = normalizeArrayInput(body?.medicalDepartments);
        const hospitalServices = normalizeArrayInput(body?.hospitalServices);

        const metadata = {
            hospitalLocation: String(body?.hospitalLocation || "").trim(),
            hospitalMapURL: String(body?.hospitalMapURL || "").trim(),
            yearEstablished: body?.yearEstablished ? Number(body.yearEstablished) : null,
            licenseAuthority: String(body?.licenseAuthority || "").trim(),
            openingTime: String(body?.openingTime || "").trim(),
            closingTime: String(body?.closingTime || "").trim(),
            daysOpen: normalizeArrayInput(body?.daysOpen),
            emergencyServices: String(body?.emergencyServices || "").trim() === "true" || body?.emergencyServices === true,
            hospitalTypeLabel,
        };

        const registrationCertificates = Array.isArray(files?.registrationCertificates) ? files.registrationCertificates : [];
        const taxClearanceDocs = Array.isArray(files?.taxClearanceDocs) ? files.taxClearanceDocs : [];
        const otherDocs = Array.isArray(files?.otherDocs) ? files.otherDocs : [];
        const adminCitizenshipFront = Array.isArray(files?.adminCitizenshipFront) ? files.adminCitizenshipFront : [];
        const adminCitizenshipBack = Array.isArray(files?.adminCitizenshipBack) ? files.adminCitizenshipBack : [];

        if (
            !isNonEmptyString(hospitalName) ||
            !isNonEmptyString(hospitalDescription) ||
            !isNonEmptyString(registrationNumber) ||
            !isNonEmptyString(primaryEmail) ||
            !isNonEmptyString(primaryPhone) ||
            !isNonEmptyString(receptionPhone) ||
            !isNonEmptyString(hospitalTypeLabel) ||
            !isNonEmptyString(metadata.hospitalLocation) ||
            !isNonEmptyString(metadata.licenseAuthority) ||
            !metadata.yearEstablished ||
            !isNonEmptyString(metadata.openingTime) ||
            !isNonEmptyString(metadata.closingTime) ||
            metadata.daysOpen.length === 0 ||
            medicalDepartments.length === 0 ||
            hospitalServices.length === 0 ||
            !isNonEmptyString(adminName) ||
            !isNonEmptyString(adminEmail) ||
            !isNonEmptyString(adminPhone) ||
            !isNonEmptyString(adminDob) ||
            !isNonEmptyString(adminGender) ||
            !isNonEmptyString(adminPassword)
        ) {
            const error = new Error("Required fields are missing.");
            error.status = 400;
            throw error;
        }

        if (adminConfirmPassword && adminPassword !== adminConfirmPassword) {
            const error = new Error("Passwords do not match.");
            error.status = 400;
            throw error;
        }

        if (
            registrationCertificates.length === 0 ||
            taxClearanceDocs.length === 0 ||
            adminCitizenshipFront.length === 0 ||
            adminCitizenshipBack.length === 0
        ) {
            const error = new Error("Registration Certificate, Tax/PAN Document, and admin citizenship front/back are required.");
            error.status = 400;
            throw error;
        }

        await client.query("BEGIN");

        const departmentIds = await ensureLookupIds({
            tableName: "departments",
            names: medicalDepartments,
            client,
        });

        const facilityIds = await ensureLookupIds({
            tableName: "facilities",
            names: hospitalServices,
            client,
        });

        const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
        const { rows } = await client.query(
            `
              INSERT INTO hospital_requests (
                full_name,
                description,
                registration_number,
                primary_email,
                primary_phone,
                alternate_email,
                alternate_phone,
                reception_phone,
                alternate_reception_phone,
                website,
                hospital_type,
                profile_picture,
                address,
                map_url,
                established_year,
                license_authority,
                opening_time,
                closing_time,
                days_open,
                emergency_services,
                hospital_type_label,
                request_note,
                approval_status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, $9, $10, NULL, $11, $12, $13, $14, $15, $16, $17, $18, $19, NULL, 'pending')
              RETURNING id
            `,
            [
                hospitalName,
                hospitalDescription,
                registrationNumber,
                primaryEmail,
                primaryPhone,
                alternateEmail,
                alternatePhone,
                receptionPhone,
                website,
                hospitalType,
                metadata.hospitalLocation,
                metadata.hospitalMapURL,
                metadata.yearEstablished,
                metadata.licenseAuthority,
                metadata.openingTime,
                metadata.closingTime,
                stringifyJson(metadata.daysOpen),
                metadata.emergencyServices,
                metadata.hospitalTypeLabel,
            ]
        );

        const requestId = rows[0]?.id;

        await client.query(
            `
              INSERT INTO hospital_request_admin (
                request_id,
                full_name,
                email,
                phone,
                password,
                date_of_birth,
                gender,
                address,
                profile_picture,
                role
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL, 'hospital')
            `,
            [
                requestId,
                adminName,
                adminEmail,
                adminPhone,
                hashedPassword,
                adminDob,
                adminGender,
                metadata.hospitalLocation || "Not provided",
            ]
        );

        for (const departmentId of departmentIds) {
            await client.query(
                `
                  INSERT INTO hospital_request_departments (request_id, department_id)
                  VALUES ($1, $2)
                  ON CONFLICT DO NOTHING
                `,
                [requestId, departmentId]
            );
        }

        for (const facilityId of facilityIds) {
            await client.query(
                `
                  INSERT INTO hospital_request_facilities (request_id, facility_id)
                  VALUES ($1, $2)
                  ON CONFLICT DO NOTHING
                `,
                [requestId, facilityId]
            );
        }

        await insertVerificationDocuments({
            client,
            requestType: "hospital_request",
            hospitalRequestId: requestId,
            filesByCategory: {
                "Admin Citizenship Front": adminCitizenshipFront,
                "Admin Citizenship Back": adminCitizenshipBack,
                "Registration Certificate": registrationCertificates,
                "Tax/PAN Document": taxClearanceDocs,
                "Other Document": otherDocs,
            },
        });

        await client.query("COMMIT");

        const { rows: admins } = await pool.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
        for (const admin of admins) {
            await createNotification({
                userId: admin.id,
                type: "general",
                title: "New Hospital Registration",
                message: `New registration request from ${hospitalName}.`,
                metadata: { request_id: requestId }
            }).catch(e => console.error("Failed to notify admin of hospital registration:", e));
        }

        return {
            message: "Registration request submitted successfully!",
            requestId,
        };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.code === "23505") {
            const constraint = String(error.constraint || "").toLowerCase();
            if (constraint.includes("email")) {
                throw { status: 409, message: "Email already exists." };
            }
            if (constraint.includes("phone")) {
                throw { status: 409, message: "Phone already exists." };
            }
            if (constraint.includes("registration")) {
                throw { status: 409, message: "Registration number already exists." };
            }
        }
        if (error?.status) throw error;
        console.error("Error registering hospital request:", error);
        throw { status: 500, message: "Failed to submit hospital request." };
    } finally {
        client.release();
    }
};

export const verifyHospitalRequest = async (id, verify, rejectionNote = null) => {
    const requestId = Number.parseInt(id, 10);
    if (!Number.isInteger(requestId)) {
        const error = new Error("Invalid hospital request id.");
        error.status = 400;
        throw error;
    }

    const decision = String(verify || "").trim().toLowerCase();
    if (!["approved", "rejected"].includes(decision)) {
        const error = new Error("Invalid verification status.");
        error.status = 400;
        throw error;
    }

    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const { rows: requestRows } = await client.query(
            `
              SELECT *
              FROM hospital_requests
              WHERE id = $1
              LIMIT 1
            `,
            [requestId]
        );

        if (!requestRows.length) {
            const error = new Error("Hospital request not found.");
            error.status = 404;
            throw error;
        }

        const request = requestRows[0];

        const { rows: adminRows } = await client.query(
            `
              SELECT *
              FROM hospital_request_admin
              WHERE request_id = $1
              LIMIT 1
            `,
            [requestId]
        );

        const admin = adminRows[0];
        if (!admin) {
            const error = new Error("Hospital request admin details are missing.");
            error.status = 400;
            throw error;
        }

        if (decision === "rejected") {
            await client.query(
                `
                  UPDATE hospital_requests
                  SET approval_status = 'rejected',
                      request_note = $2
                  WHERE id = $1
                `,
                [requestId, rejectionNote]
            );
            await client.query("COMMIT");

            sendRejectionEmail({
                to: admin.email,
                name: admin.full_name,
                reason: rejectionNote,
                accountType: "hospital"
            }).catch((e) => console.error("Failed to send rejection email:", e));

            return { message: "Hospital request rejected successfully." };
        }

        const { rows: existingHospitalRows } = await client.query(
            `
              SELECT id
              FROM hospitals
              WHERE registration_number = $1
              LIMIT 1
            `,
            [request.registration_number]
        );

        if (existingHospitalRows.length > 0) {
            const error = new Error("This hospital has already been approved.");
            error.status = 409;
            throw error;
        }

        const { rows: userRows } = await client.query(
            `
              INSERT INTO users (
                full_name,
                email,
                phone,
                password,
                date_of_birth,
                gender,
                address,
                profile_picture,
                role,
                status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'hospital', 'active')
              RETURNING id
            `,
            [
                admin.full_name,
                admin.email,
                admin.phone,
                admin.password,
                admin.date_of_birth,
                admin.gender,
                admin.address,
                admin.profile_picture,
            ]
        );

        const userId = userRows[0]?.id;

        const { rows: hospitalRows } = await client.query(
            `
              INSERT INTO hospitals (
                full_name,
                description,
                registration_number,
                primary_email,
                primary_phone,
                alternate_email,
                alternate_phone,
                reception_phone,
                alternate_reception_phone,
                website,
                hospital_type,
                profile_picture,
                address,
                map_url,
                established_year,
                license_authority,
                opening_time,
                closing_time,
                days_open,
                emergency_services,
                hospital_type_label,
                status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'active')
              RETURNING id
            `,
            [
                request.full_name,
                request.description,
                request.registration_number,
                request.primary_email,
                request.primary_phone,
                request.alternate_email,
                request.alternate_phone,
                request.reception_phone,
                request.alternate_reception_phone,
                request.website,
                request.hospital_type,
                request.profile_picture,
                request.address,
                request.map_url,
                request.established_year,
                request.license_authority,
                request.opening_time,
                request.closing_time,
                stringifyJson(request.days_open),
                request.emergency_services,
                request.hospital_type_label,
            ]
        );

        const hospitalId = hospitalRows[0]?.id;

        await client.query(
            `
              INSERT INTO hospital_admin (hospital_id, user_id)
              VALUES ($1, $2)
            `,
            [hospitalId, userId]
        );

        const { rows: departmentRows } = await client.query(
            `
              SELECT department_id
              FROM hospital_request_departments
              WHERE request_id = $1
            `,
            [requestId]
        );

        for (const row of departmentRows) {
            await client.query(
                `
                  INSERT INTO hospital_departments (hospital_id, department_id)
                  VALUES ($1, $2)
                  ON CONFLICT DO NOTHING
                `,
                [hospitalId, row.department_id]
            );
        }

        const { rows: facilityRows } = await client.query(
            `
              SELECT facility_id
              FROM hospital_request_facilities
              WHERE request_id = $1
            `,
            [requestId]
        );

        for (const row of facilityRows) {
            await client.query(
                `
                  INSERT INTO hospital_facilities (hospital_id, facility_id)
                  VALUES ($1, $2)
                  ON CONFLICT DO NOTHING
                `,
                [hospitalId, row.facility_id]
            );
        }

        await client.query(
            `
              UPDATE hospital_requests
              SET approval_status = 'approved'
              WHERE id = $1
            `,
            [requestId]
        );

        await client.query(
            `
              UPDATE verification_documents
              SET user_id = $1,
                  status = 'approved',
                  updated_at = NOW()
              WHERE hospital_request_id = $2
            `,
            [userId, requestId]
        );

        await client.query("COMMIT");

        await Promise.all([
            createNotification({
                userId: userId,
                type: "general",
                title: "Registration Approved",
                message: "Congratulations! Your hospital registration with e-Swasthya has been approved. You can now access your dashboard.",
            }).catch(e => console.error("Failed to create approval notification:", e)),
            sendApprovalEmail({
                to: admin.email,
                name: admin.full_name,
                accountType: "hospital"
            }).catch(e => console.error("Failed to send approval email:", e))
        ]);

        return { message: "Hospital request verified and hospital created successfully." };
    } catch (error) {
        await client.query("ROLLBACK");
        if (error?.status) throw error;
        if (error?.code === "23505") {
            const constraint = String(error.constraint || "").toLowerCase();
            const detail = String(error.detail || "");
            
            let fieldName = "";
            const match = detail.match(/Key \(([^)]+)\)=/);
            if (match && match[1]) {
                fieldName = match[1];
            }

            let userMessage = "Hospital request could not be approved because related records already exist.";
            
            if (constraint.includes("users_email_unique") || fieldName === "email") {
                userMessage = "Admin email address is already registered to another user.";
            } else if (constraint.includes("users_phone_unique") || fieldName === "phone") {
                userMessage = "Admin phone number is already registered to another user.";
            } else if (constraint.includes("hospitals_registration_number_unique") || fieldName === "registration_number") {
                userMessage = "Hospital registration number is already registered by another hospital.";
            } else if (constraint.includes("hospitals_primary_email_unique") || fieldName === "primary_email") {
                userMessage = "Hospital primary email is already in use by another hospital.";
            } else if (constraint.includes("hospitals_primary_phone_unique") || fieldName === "primary_phone") {
                userMessage = "Hospital primary phone number is already in use by another hospital.";
            } else if (constraint.includes("hospitals_alternate_email_unique") || fieldName === "alternate_email") {
                userMessage = "Hospital alternate email is already in use by another hospital.";
            } else if (constraint.includes("hospitals_alternate_phone_unique") || fieldName === "alternate_phone") {
                userMessage = "Hospital alternate phone number is already in use by another hospital.";
            } else if (constraint.includes("hospitals_reception_phone_unique") || fieldName === "reception_phone") {
                userMessage = "Hospital reception phone number is already in use by another hospital.";
            } else if (constraint.includes("hospitals_alternate_reception_phone_unique") || fieldName === "alternate_reception_phone") {
                userMessage = "Hospital alternate reception phone number is already in use by another hospital.";
            } else if (fieldName) {
                const formattedField = fieldName.replace(/_/g, " ");
                userMessage = `Hospital request could not be approved because the ${formattedField} already exists in the system.`;
            }

            throw { status: 409, message: userMessage };
        }
        console.error("Error verifying hospital request:", error);
        throw { status: 500, message: "Failed to verify hospital request." };
    } finally {
        client.release();
    }
};

export const getHospitalRequests = async () => {
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
                hr.profile_picture AS hospital_profile_picture,
                hra.full_name AS admin_name,
                hra.email AS admin_email,
                hra.phone AS admin_phone,
                hra.date_of_birth AS admin_date_of_birth,
                hra.gender::text AS admin_gender,
                hra.address AS admin_address,
                hra.profile_picture AS admin_profile_picture,
                hr.approval_status::text AS request_status,
                hr.created_at,
                hr.request_note,
                hr.address,
                hr.map_url,
                hr.established_year,
                hr.license_authority,
                hr.opening_time,
                hr.closing_time,
                hr.days_open,
                hr.emergency_services,
                hr.hospital_type_label,
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
                    'file_size', vd.file_size,
                    'mime_type', vd.mime_type,
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

        return rows.map((row) => {
            return {
                request_id: row.request_id,
                hospital_name: row.hospital_name,
                hospital_description: row.hospital_description || "",
                registration_number: row.registration_number || "",
                hospital_primary_email: row.hospital_primary_email || "",
                hospital_primary_phone: row.hospital_primary_phone || "",
                hospital_alternate_email: row.hospital_alternate_email || "",
                hospital_alternate_phone: row.hospital_alternate_phone || "",
                hospital_reception_phone: row.hospital_reception_phone || "",
                hospital_alternate_reception_phone: row.hospital_alternate_reception_phone || "",
                hospital_website: row.hospital_website || "",
                hospital_type: row.hospital_type || "",
                hospital_type_label: row.hospital_type_label || titleCase(row.hospital_type || ""),
                hospital_profile_picture: row.hospital_profile_picture || "",
                hospital_address: row.address || "",
                hospital_map_url: row.map_url || "",
                hospital_established_year: row.established_year || null,
                hospital_license_authority: row.license_authority || "",
                hospital_opening_time: row.opening_time || "",
                hospital_closing_time: row.closing_time || "",
                hospital_days_open: normalizeObjectArray(parseJson(row.days_open, []) || []),
                hospital_emergency_services:
                    typeof row.emergency_services === "boolean" ? row.emergency_services : null,
                admin_name: row.admin_name || "",
                admin_email: row.admin_email || "",
                admin_phone: row.admin_phone || "",
                admin_date_of_birth: row.admin_date_of_birth || null,
                admin_gender: titleCase(row.admin_gender || ""),
                admin_address: row.admin_address || "",
                admin_profile_picture: row.admin_profile_picture || "",
                request_status: titleCase(row.request_status),
                created_at: row.created_at,
                request_note: row.request_note || "",
                departments: normalizeObjectArray(row.departments),
                facilities: normalizeObjectArray(row.facilities),
                verification_documents: normalizeObjectArray(row.verification_documents).map((document) => ({
                    ...document,
                    status: titleCase(document?.status || ""),
                })),
            };
        });
    } catch (error) {
        console.error("Error fetching hospital requests:", error);
        const err = new Error("Failed to fetch hospital requests.");
        err.status = 500;
        throw err;
    }
};



export const searchHospitals = async ({
    query = "",
    typesArray = [],
    departmentsArray = [],
    facilityIdsArray = [],
    sort = "name",
    order = "ASC",
}) => {
    try {
        const { rows } = await pool.query(
            `${getHospitalListQuery("LOWER(COALESCE(h.status::text, 'active')) = 'active'")}
             ORDER BY h.full_name ASC`
        );

        let hospitals = rows.map(mapHospitalRow);
        const normalizedQuery = String(query || "").trim().toLowerCase();

        if (normalizedQuery) {
            hospitals = hospitals.filter((hospital) => {
                const haystack = [
                    hospital.hospital_name,
                    hospital.hospital_address,
                    hospital.hospital_type,
                    hospital.hospital_description,
                    ...(Array.isArray(hospital.departments) ? hospital.departments : []),
                    ...(Array.isArray(hospital.facilities) ? hospital.facilities : []),
                ]
                    .join(" ")
                    .toLowerCase();

                return haystack.includes(normalizedQuery);
            });
        }

        const normalizedTypes = normalizeArrayInput(typesArray).map((item) => item.toLowerCase());
        if (normalizedTypes.length > 0) {
            hospitals = hospitals.filter((hospital) =>
                normalizedTypes.includes(String(hospital.hospital_type || "").trim().toLowerCase())
            );
        }

        const normalizedDepartments = normalizeArrayInput(departmentsArray).map((item) => item.toLowerCase());
        if (normalizedDepartments.length > 0) {
            hospitals = hospitals.filter((hospital) =>
                normalizedDepartments.every((department) =>
                    (Array.isArray(hospital.departments) ? hospital.departments : [])
                        .map((item) => String(item || "").toLowerCase())
                        .includes(department)
                )
            );
        }

        const normalizedFacilityIds = (Array.isArray(facilityIdsArray) ? facilityIdsArray : [])
            .map((item) => Number.parseInt(item, 10))
            .filter((item) => Number.isInteger(item));

        if (normalizedFacilityIds.length > 0) {
            const { rows: facilityRows } = await pool.query(
                `
                  SELECT id, name
                  FROM facilities
                  WHERE id = ANY($1::int[])
                `,
                [normalizedFacilityIds]
            );
            const facilityNames = facilityRows.map((row) => String(row.name || "").toLowerCase());
            hospitals = hospitals.filter((hospital) =>
                facilityNames.every((facilityName) =>
                    (Array.isArray(hospital.facilities) ? hospital.facilities : [])
                        .map((item) => String(item || "").toLowerCase())
                        .includes(facilityName)
                )
            );
        }

        const normalizedOrder = String(order || "ASC").trim().toUpperCase() === "DESC" ? -1 : 1;
        hospitals.sort((a, b) => {
            if (sort === "year") {
                const yearA = Number(a.hospital_established_year || 0);
                const yearB = Number(b.hospital_established_year || 0);
                return (yearA - yearB) * normalizedOrder;
            }

            return String(a.hospital_name || "").localeCompare(String(b.hospital_name || "")) * normalizedOrder;
        });

        return hospitals;
    } catch (error) {
        console.error("Error searching hospitals:", error);
        const err = new Error("Failed to search hospitals");
        err.status = 500;
        throw err;
    }
};

export const getHospitalPatients = async () => {
    const { rows } = await pool.query(
        `SELECT id AS user_id, full_name, email
         FROM users
         WHERE LOWER(role::text) = 'user'
         ORDER BY full_name ASC`
    );
    return rows;
};

export const createHospitalAppointment = async ({ adminUserId, patientEmail, patientId, doctorId, date, time, type, reason }) => {
    const normalizedAdminId = Number.parseInt(adminUserId, 10);
    const normalizedDoctorId = Number.parseInt(doctorId, 10);

    if (!Number.isInteger(normalizedAdminId) || !Number.isInteger(normalizedDoctorId)) {
        const e = new Error("Invalid IDs provided."); e.status = 400; throw e;
    }
    if ((!patientEmail && !patientId) || !date || !time || !type) {
        const e = new Error("Patient, date, time, and type are required."); e.status = 400; throw e;
    }

    const normalizedType = String(type || "").trim().toLowerCase();
    const appointmentType = /(online|virtual|video|tele)/.test(normalizedType) ? "online" : "physical";

    const client = await pool.connect();
    try {
        // Resolve hospital from admin
        const hospitalRes = await client.query(
            `SELECT h.id AS hospital_id FROM hospital_admin ha JOIN hospitals h ON h.id = ha.hospital_id WHERE ha.user_id = $1 LIMIT 1`,
            [normalizedAdminId]
        );
        if (!hospitalRes.rows.length) {
            const e = new Error("Hospital not found for this account."); e.status = 404; throw e;
        }
        const hospitalId = hospitalRes.rows[0].hospital_id;

        // Verify doctor is affiliated with this hospital
        const affiliationRes = await client.query(
            `SELECT id FROM doctor_hospital_assignments WHERE hospital_id = $1 AND doctor_id = $2 LIMIT 1`,
            [hospitalId, normalizedDoctorId]
        );
        if (!affiliationRes.rows.length) {
            const e = new Error("Doctor is not affiliated with this hospital."); e.status = 400; throw e;
        }

        // Resolve patient by id or email
        let resolvedPatientId;
        if (patientId) {
            const normalizedPatientId = Number.parseInt(patientId, 10);
            if (!Number.isInteger(normalizedPatientId)) {
                const e = new Error("Invalid patient ID."); e.status = 400; throw e;
            }
            const patientRes = await client.query(`SELECT id FROM users WHERE id = $1 LIMIT 1`, [normalizedPatientId]);
            if (!patientRes.rows.length) { const e = new Error("Patient not found."); e.status = 404; throw e; }
            resolvedPatientId = patientRes.rows[0].id;
        } else {
            const patientRes = await client.query(
                `SELECT id FROM users WHERE email = $1 LIMIT 1`,
                [String(patientEmail).trim().toLowerCase()]
            );
            if (!patientRes.rows.length) {
                const e = new Error("No patient account found with that email."); e.status = 404; throw e;
            }
            resolvedPatientId = patientRes.rows[0].id;
        }

        await client.query("BEGIN");
        const { rows } = await client.query(
            `INSERT INTO appointments (patient_id, doctor_id, hospital_id, appointment_type, appointment_date, appointment_time, status, reason_for_visit)
             VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7) RETURNING id`,
            [resolvedPatientId, normalizedDoctorId, hospitalId, appointmentType, date, time, String(reason || "").trim() || "General consultation"]
        );
        await client.query("COMMIT");
        return { appointmentId: rows[0].id };
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        if (error?.status) throw error;
        const e = new Error("Failed to create appointment."); e.status = 500; throw e;
    } finally {
        client.release();
    }
};

export const getHospitalDashboardStats = async ({ hospitalId }) => {
    try {
        const id = Number.parseInt(hospitalId, 10);
        
        const statsRes = await pool.query(
            `
            SELECT
                (SELECT COUNT(*) FROM doctor_hospital_assignments WHERE hospital_id = $1) as total_doctors,
                (SELECT COUNT(*) FROM appointments WHERE hospital_id = $1) as total_appointments,
                (SELECT COUNT(*) FROM appointments WHERE hospital_id = $1 AND appointment_date = CURRENT_DATE) as today_appointments,
                (SELECT COUNT(*) FROM reviews WHERE hospital_id = $1) as total_reviews
            `,
            [id]
        );

        const topBookedRes = await pool.query(
            `
            SELECT 
                u.full_name,
                u.profile_picture,
                COUNT(a.id) as booking_count
            FROM appointments a
            JOIN users u ON u.id = a.doctor_id
            WHERE a.hospital_id = $1
            GROUP BY u.id, u.full_name, u.profile_picture
            ORDER BY booking_count DESC
            LIMIT 5
            `,
            [id]
        );

        const topRatedRes = await pool.query(
            `
            SELECT 
                u.full_name,
                u.profile_picture,
                COALESCE(AVG(r.rating), 0) as avg_rating,
                COUNT(r.id) as review_count
            FROM doctor_hospital_assignments dha
            JOIN users u ON u.id = dha.doctor_id
            LEFT JOIN reviews r ON r.doctor_id = u.id
            WHERE dha.hospital_id = $1
            GROUP BY u.id, u.full_name, u.profile_picture
            HAVING COUNT(r.id) > 0
            ORDER BY avg_rating DESC, review_count DESC
            LIMIT 5
            `,
            [id]
        );

        const trendRes = await pool.query(
            `
            SELECT 
                d.day::date as date,
                COUNT(a.id) as count
            FROM (
                SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date as day
            ) d
            LEFT JOIN appointments a ON a.appointment_date = d.day AND a.hospital_id = $1
            GROUP BY d.day
            ORDER BY d.day ASC
            `,
            [id]
        );

        return {
            summary: statsRes.rows[0],
            topBookedDoctors: topBookedRes.rows,
            topRatedDoctors: topRatedRes.rows,
            appointmentTrend: trendRes.rows
        };
    } catch (error) {
        console.error("Error fetching hospital dashboard stats:", error);
        throw { status: 500, message: "Failed to load dashboard statistics." };
    }
};

export const updateHospitalDetails = async (hospitalId, payload) => {
    const id = Number.parseInt(hospitalId, 10);
    if (!Number.isInteger(id)) {
        throw { status: 400, message: "Invalid hospital ID." };
    }

    const {
        hospital_name,
        hospital_description,
        hospital_primary_phone,
        hospital_reception_phone,
        hospital_alternate_phone,
        hospital_alternate_reception_phone,
        hospital_primary_email,
        hospital_alternate_email,
        hospital_established_year,
        hospital_map_url,
        opening_time,
        closing_time,
        days_open,
        emergency_services,
    } = payload;

    const cleanDaysOpen = days_open ? stringifyJson(normalizeArrayInput(days_open)) : null;

    try {
        await pool.query(
            `UPDATE hospitals SET
              full_name = COALESCE($1, full_name),
              description = COALESCE($2, description),
              primary_phone = COALESCE($3, primary_phone),
              reception_phone = COALESCE($4, reception_phone),
              alternate_phone = COALESCE($5, alternate_phone),
              alternate_reception_phone = COALESCE($6, alternate_reception_phone),
              primary_email = COALESCE($7, primary_email),
              alternate_email = COALESCE($8, alternate_email),
              established_year = COALESCE($9, established_year),
              map_url = COALESCE($10, map_url),
              opening_time = COALESCE($11, opening_time),
              closing_time = COALESCE($12, closing_time),
              days_open = COALESCE($13, days_open),
              emergency_services = COALESCE($14, emergency_services)
            WHERE id = $15`,
            [
                hospital_name || null,
                hospital_description || null,
                hospital_primary_phone || null,
                hospital_reception_phone || null,
                hospital_alternate_phone || null,
                hospital_alternate_reception_phone || null,
                hospital_primary_email || null,
                hospital_alternate_email || null,
                hospital_established_year ? Number(hospital_established_year) : null,
                hospital_map_url || null,
                opening_time || null,
                closing_time || null,
                cleanDaysOpen,
                emergency_services !== undefined ? (emergency_services === "true" || emergency_services === true) : null,
                id,
            ]
        );
        return { message: "Hospital details updated successfully." };
    } catch (error) {
        console.error("Error updating hospital details:", error);
        throw { status: 500, message: error.message || "Failed to update hospital details." };
    }
};
