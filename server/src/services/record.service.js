import fs from "fs";
import path from "path";
import pool from "../config/db.js";
import s3, { BUCKET } from "../config/s3.js";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const isAWS = process.env.USE_AWS === "true";
const uploadsDir = path.join(process.cwd(), "uploads");

const resolveStoredRecordPath = (value = "") => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    if (path.isAbsolute(raw)) {
        if (raw.includes("uploads\\private\\medical-records") && !raw.includes("uploads\\private\\patients\\medical-records")) {
            return raw.replace("uploads\\private\\medical-records", "uploads\\private\\patients\\medical-records");
        }
        if (raw.includes("uploads/private/medical-records") && !raw.includes("uploads/private/patients/medical-records")) {
            return raw.replace("uploads/private/medical-records", "uploads/private/patients/medical-records");
        }
        return raw;
    }

    if (raw.startsWith("/uploads/") || raw.startsWith("uploads/")) {
        const relativePath = raw.replace(/^\/+/, "");
        return path.join(process.cwd(), relativePath);
    }

    // Default fallback
    return path.join(uploadsDir, path.basename(raw));
};


export const handleFileUpload = async (userId, file, title) => {
    if (!userId) {
        const error = new Error("Invalid user.");
        error.status = 400;
        throw error;
    }
    if (!title || !String(title).trim()) {
        const error = new Error("Record title is required.");
        error.status = 400;
        throw error;
    }
    if (!file) {
        const error = new Error("No file uploaded");
        error.status = 400;
        throw error;
    }

    // Use S3 URL directly when on AWS, otherwise build a relative local path
    const recordUrl = isAWS
        ? file.location
        : `uploads/private/patients/medical-records/${file.filename}`;

    try {
        const { rows } = await pool.query(
            `
              INSERT INTO medical_records (user_id, name, url)
              VALUES ($1, $2, $3)
              RETURNING id, user_id, name, url, created_at, updated_at
            `,
            [userId, title, recordUrl]
        );
        if (!rows.length) {
            const error = new Error("Failed to save record metadata.");
            error.status = 500;
            throw error;
        }
        const record = rows[0];
        return {
            record_id: record.id,
            record_title: record.name,
            record_file: record.url,
            uploaded_at: record.created_at,
        };
    } catch (error) {
        if (error?.code === "23505") {
            const err = new Error(`A record with the title "${title}" already exists. Please use a unique name.`);
            err.status = 409;
            throw err;
        }

        console.error("Upload Service Error:", error);
        const err = new Error(error.message || "Failed to save record.");
        err.status = 500;
        throw err;
    }
};

export const getUserRecords = async (userId) => {
    if (!userId) {
        const error = new Error("Invalid user.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
              SELECT id, user_id, name, url, created_at, updated_at
              FROM medical_records
              WHERE user_id = $1
              ORDER BY created_at DESC, id DESC
            `,
            [userId]
        );
        if (!rows.length) {
            return [];
        }

        return rows.map(record => ({
            record_id: record.id,
            user_id: record.user_id,
            record_title: record.name,
            record_file: record.url,
            uploaded_at: record.created_at,
            updated_at: record.updated_at
        }));
    } catch (error) {
        console.error("Get Records Error:", error);
        const err = new Error("Internal Server Error");
        err.status = 500;
        throw err;
    }
};


export const renameRecord = async (userId, recordId, title) => {
    if (!userId) {
        const error = new Error("Invalid user.");
        error.status = 400;
        throw error;
    }
    if (!recordId) {
        const error = new Error("Invalid record id.");
        error.status = 400;
        throw error;
    }
    if (!title || !String(title).trim()) {
        const error = new Error("Record title is required.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
              UPDATE medical_records
              SET name = $1,
                  updated_at = NOW()
              WHERE id = $2
                AND user_id = $3
              RETURNING id, user_id, name, url, created_at, updated_at
            `,
            [title, recordId, userId]
        );

        if (!rows.length) {
            const error = new Error("Record not found.");
            error.status = 404;
            throw error;
        }
        if (!rows[0].name) {
            const error = new Error("Failed to rename record.");
            error.status = 500;
            throw error;
        }
        const record = rows[0];
        return {
            record_id: record.id,
            record_name: record.name,
            record_file: record.url,
            created_at: record.created_at,
            updated_at: record.updated_at
        };
    } catch (error) {
        if (error?.code === "23505") {
            const err = new Error(`A record with the title "${title}" already exists. Please use a unique name.`);
            err.status = 409;
            throw err;
        }
        if (error?.status) throw error;
        console.error("Rename Record Error:", error);
        const err = new Error("Internal Server Error");
        err.status = 500;
        throw err;
    }
};

export const deleteRecord = async (userId, recordId) => {
    const normalizedUserId = Number.parseInt(userId, 10);
    const normalizedRecordId = Number.parseInt(recordId, 10);

    if (!Number.isInteger(normalizedUserId) || !Number.isInteger(normalizedRecordId)) {
        const error = new Error("Invalid record id.");
        error.status = 400;
        throw error;
    }

    const client = await pool.connect();
    let committed = false;

    try {
        await client.query("BEGIN");

        const { rows: recordRows } = await client.query(
            `
              SELECT id, url
              FROM medical_records
              WHERE id = $1
                AND user_id = $2
              FOR UPDATE
            `,
            [normalizedRecordId, normalizedUserId]
        );

        if (!recordRows.length) {
            const error = new Error("Record not found.");
            error.status = 404;
            throw error;
        }

        await client.query(
            `
              DELETE FROM appointment_records
              WHERE record_id = $1
            `,
            [normalizedRecordId]
        );

        const { rows } = await client.query(
            `
              DELETE FROM medical_records
              WHERE id = $1
                AND user_id = $2
              RETURNING id, url
            `,
            [normalizedRecordId, normalizedUserId]
        );

        if (!rows.length) {
            const error = new Error("Record not found.");
            error.status = 404;
            throw error;
        }

        await client.query("COMMIT");
        committed = true;

        const storedUrl = rows[0]?.url || "";

        if (isAWS && s3 && storedUrl.startsWith("https://")) {
            // Extract the S3 key from the full URL
            const urlObj = new URL(storedUrl);
            const key = urlObj.pathname.replace(/^\//, "");
            try {
                await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
            } catch {
                // Non-fatal — DB record is still deleted
            }
        } else {
            const filePath = resolveStoredRecordPath(storedUrl);
            if (filePath && fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                } catch {
                }
            }
        }

        return { record_id: rows[0].id };
    } catch (error) {
        if (!committed) {
            try {
                await client.query("ROLLBACK");
            } catch {
            }
        }
        if (error?.status) throw error;
        console.error("Delete Record Error:", error);
        const err = new Error("Internal Server Error");
        err.status = 500;
        throw err;
    } finally {
        client.release();
    }
};

export const getRecordViewPath = async (userId, role, recordId) => {
    const rId = Number.parseInt(recordId, 10);
    const uId = Number.parseInt(userId, 10);

    if (!Number.isInteger(rId) || !Number.isInteger(uId)) {
        const error = new Error("Invalid record id or user id.");
        error.status = 400;
        throw error;
    }

    let query = "";
    let params = [];

    if (role === "doctor") {
        query = `
            SELECT mr.url, mr.name as record_name
            FROM medical_records mr
            JOIN appointment_records ar ON ar.record_id = mr.id
            JOIN appointments a ON a.id = ar.appointment_id
            WHERE mr.id = $1 AND a.doctor_id = $2
            LIMIT 1
        `;
        params = [rId, uId];
    } else if (role === "admin") {
        query = `SELECT url, name as record_name FROM medical_records WHERE id = $1`;
        params = [rId];
    } else if (role && role.includes("hospital")) {
        query = `
            SELECT mr.url, mr.name as record_name
            FROM medical_records mr
            JOIN appointment_records ar ON ar.record_id = mr.id
            JOIN appointments a ON a.id = ar.appointment_id
            WHERE mr.id = $1 AND a.hospital_id IN (
                SELECT hospital_id FROM hospital_admin WHERE user_id = $2
            )
            LIMIT 1
        `;
        params = [rId, uId];
    } else {
        query = `SELECT url, name as record_name FROM medical_records WHERE id = $1 AND user_id = $2`;
        params = [rId, uId];
    }

    const { rows } = await pool.query(query, params);

    if (!rows.length) {
        const error = new Error("Record not found or access denied.");
        error.status = 404;
        throw error;
    }

    const storedUrl = rows[0].url || "";

    // S3 path — return a short-lived pre-signed URL instead of streaming the file
    if (isAWS && s3 && storedUrl.startsWith("https://")) {
        const urlObj = new URL(storedUrl);
        const key = urlObj.pathname.replace(/^\//, "");
        const signedUrl = await getSignedUrl(
            s3,
            new GetObjectCommand({ Bucket: BUCKET, Key: key }),
            { expiresIn: 300 } // 5-minute expiry
        );
        return { signedUrl, fileName: rows[0].record_name };
    }

    // Local path
    const filePath = resolveStoredRecordPath(storedUrl);

    if (!fs.existsSync(filePath)) {
        const error = new Error("File not found on server.");
        error.status = 404;
        throw error;
    }

    return { filePath, fileName: rows[0].record_name };
};
