import pool from "../config/db.js";
import { parsePositiveInt } from "../utils/helpers.js";

const normalizeEntityId = (value, label) => parsePositiveInt(value, `Invalid ${label}.`);

const normalizeRating = (value) => {
    const normalized = Number.parseInt(value, 10);
    if (!Number.isInteger(normalized) || normalized < 1 || normalized > 5) {
        const error = new Error("Rating must be between 1 and 5.");
        error.status = 400;
        throw error;
    }
    return normalized;
};

const mapReviewRow = (row = {}) => ({
    review_id: row.review_id ?? row.id,
    review_type: row.review_type || (row.doctor_id ? "Doctor" : "Hospital"),
    rating: row.rating,
    comment: row.comment,
    created_at: row.created_at,
    updated_at: row.updated_at,
    reviewer_id: row.reviewer_id,
    reviewer_name: row.reviewer_name,
    reviewer_profile: row.reviewer_profile,
    doctor_id: row.doctor_id ?? null,
    hospital_id: row.hospital_id ?? null,
    doctor_name: row.doctor_name ?? null,
    hospital_name: row.hospital_name ?? null,
    target_name: row.target_name ?? row.doctor_name ?? row.hospital_name ?? null,
});

const normalizeAdminReviewScope = (value) => {
    const normalized = String(value || "system").trim().toLowerCase();
    if (normalized === "doctor" || normalized === "hospital" || normalized === "system" || normalized === "all") {
        return normalized;
    }

    const error = new Error("Invalid review scope.");
    error.status = 400;
    throw error;
};

export const getFeaturedReviews = async (limit = 6) => {
    try {
        const safeLimit = Math.min(20, Math.max(1, Number.parseInt(limit, 10) || 6));
        const { rows } = await pool.query(
            `
              SELECT
                r.id AS review_id,
                CASE WHEN r.doctor_id IS NOT NULL THEN 'Doctor' ELSE 'Hospital' END AS review_type,
                r.rating,
                r.comment,
                r.created_at,
                reviewer.id AS reviewer_id,
                reviewer.full_name AS reviewer_name,
                reviewer.profile_picture AS reviewer_profile,
                r.doctor_id,
                r.hospital_id,
                doctor_user.full_name AS doctor_name,
                hospital.full_name AS hospital_name
              FROM reviews r
              JOIN users reviewer ON reviewer.id = r.patient_id
              LEFT JOIN users doctor_user ON doctor_user.id = r.doctor_id
              LEFT JOIN hospitals hospital ON hospital.id = r.hospital_id
              ORDER BY r.created_at DESC, r.id DESC
              LIMIT $1
            `,
            [safeLimit]
        );

        return rows.map(mapReviewRow);
    } catch (error) {
        console.error("Error fetching featured reviews:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getAdminReviews = async (scope = "system") => {
    const normalizedScope = normalizeAdminReviewScope(scope);

    const whereClause =
        normalizedScope === "doctor"
            ? "WHERE r.doctor_id IS NOT NULL"
            : normalizedScope === "hospital"
                ? "WHERE r.hospital_id IS NOT NULL"
                : "";

    try {
        const { rows } = await pool.query(
            `
              SELECT
                r.id AS review_id,
                CASE WHEN r.doctor_id IS NOT NULL THEN 'Doctor' ELSE 'Hospital' END AS review_type,
                r.rating,
                r.comment,
                r.created_at,
                r.updated_at,
                reviewer.id AS reviewer_id,
                reviewer.full_name AS reviewer_name,
                reviewer.profile_picture AS reviewer_profile,
                r.doctor_id,
                r.hospital_id,
                doctor_user.full_name AS doctor_name,
                hospital.full_name AS hospital_name,
                COALESCE(doctor_user.full_name, hospital.full_name) AS target_name
              FROM reviews r
              JOIN users reviewer ON reviewer.id = r.patient_id
              LEFT JOIN users doctor_user ON doctor_user.id = r.doctor_id
              LEFT JOIN hospitals hospital ON hospital.id = r.hospital_id
              ${whereClause}
              ORDER BY r.created_at DESC, r.id DESC
            `
        );

        return rows.map(mapReviewRow);
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error fetching admin reviews:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getReviewsForSingleDoctor = async (doctorId) => {
    const normalizedDoctorId = normalizeEntityId(doctorId, "doctor id");
    try {
        const { rows } = await pool.query(
            `
              SELECT
                r.id AS review_id,
                r.rating,
                r.comment,
                r.created_at,
                r.updated_at,
                reviewer.id AS reviewer_id,
                reviewer.full_name AS reviewer_name,
                reviewer.profile_picture AS reviewer_profile
              FROM reviews r
              JOIN users reviewer ON reviewer.id = r.patient_id
              WHERE r.doctor_id = $1
              ORDER BY r.created_at DESC, r.id DESC
            `,
            [normalizedDoctorId]
        );

        return rows.map(mapReviewRow);
    } catch (error) {
        console.error("Error fetching doctor reviews:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getReviewsForSingleHospital = async (hospitalId) => {
    const normalizedHospitalId = normalizeEntityId(hospitalId, "hospital id");
    try {
        const { rows } = await pool.query(
            `
              SELECT
                r.id AS review_id,
                r.rating,
                r.comment,
                r.created_at,
                r.updated_at,
                reviewer.id AS reviewer_id,
                reviewer.full_name AS reviewer_name,
                reviewer.profile_picture AS reviewer_profile
              FROM reviews r
              JOIN users reviewer ON reviewer.id = r.patient_id
              WHERE r.hospital_id = $1
              ORDER BY r.created_at DESC, r.id DESC
            `,
            [normalizedHospitalId]
        );

        return rows.map(mapReviewRow);
    } catch (error) {
        console.error("Error fetching hospital reviews:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

const assertReviewEligibility = async ({ entity, entityId, userId }) => {
    const targetColumn = entity === "doctor" ? "doctor_id" : "hospital_id";
    const targetLabel = entity === "doctor" ? "doctor" : "hospital";

    const { rows } = await pool.query(
        `
          SELECT 1
          FROM appointments
          WHERE patient_id = $1
            AND ${targetColumn} = $2
            AND LOWER(status::text) = 'completed'
          LIMIT 1
        `,
        [userId, entityId]
    );

    if (!rows.length) {
        const error = new Error(`You have never booked an appointment with this ${targetLabel}.`);
        error.status = 403;
        throw error;
    }
};

export const createReview = async (entityId, userId, entity, rating, comment) => {
    const normalizedEntityId = normalizeEntityId(entityId, `${entity} id`);
    const normalizedUserId = normalizeEntityId(userId, "user id");
    const normalizedRating = normalizeRating(rating);
    const normalizedComment = String(comment || "").trim() || null;

    try {
        await assertReviewEligibility({ entity, entityId: normalizedEntityId, userId: normalizedUserId });

        const { rows: existingRows } = await pool.query(
            entity === "doctor"
                ? `SELECT id FROM reviews WHERE patient_id = $1 AND doctor_id = $2 LIMIT 1`
                : `SELECT id FROM reviews WHERE patient_id = $1 AND hospital_id = $2 LIMIT 1`,
            [normalizedUserId, normalizedEntityId]
        );

        if (existingRows.length > 0) {
            const error = new Error(`You have already reviewed this ${entity}.`);
            error.status = 400;
            throw error;
        }

        const { rows } = await pool.query(
            entity === "doctor"
                ? `INSERT INTO reviews (patient_id, doctor_id, hospital_id, rating, comment)
                   VALUES ($1, $2, NULL, $3, $4) RETURNING id`
                : `INSERT INTO reviews (patient_id, doctor_id, hospital_id, rating, comment)
                   VALUES ($1, NULL, $2, $3, $4) RETURNING id`,
            [normalizedUserId, normalizedEntityId, normalizedRating, normalizedComment]
        );

        return { review_id: rows[0]?.id };
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error creating review:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getReviewsByUser = async (userId) => {
    const normalizedUserId = normalizeEntityId(userId, "user id");
    try {
        const { rows } = await pool.query(
            `
              SELECT
                r.id AS review_id,
                CASE WHEN r.doctor_id IS NOT NULL THEN 'Doctor' ELSE 'Hospital' END AS review_type,
                r.rating,
                r.comment,
                r.created_at,
                r.updated_at,
                r.doctor_id,
                r.hospital_id,
                doctor_user.full_name AS doctor_name,
                hospital.full_name AS hospital_name
              FROM reviews r
              LEFT JOIN users doctor_user ON doctor_user.id = r.doctor_id
              LEFT JOIN hospitals hospital ON hospital.id = r.hospital_id
              WHERE r.patient_id = $1
              ORDER BY r.created_at DESC, r.id DESC
            `,
            [normalizedUserId]
        );

        return rows.map(mapReviewRow);
    } catch (error) {
        console.error("Error fetching user reviews:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getDoctorReviewEligibility = async (doctorId, userId) => {
    const normalizedDoctorId = normalizeEntityId(doctorId, "doctor id");
    const normalizedUserId = normalizeEntityId(userId, "user id");

    try {
        const { rows: completedRows } = await pool.query(
            `
              SELECT 1 FROM appointments WHERE patient_id = $1 AND doctor_id = $2 AND LOWER(status::text) = 'completed' LIMIT 1
            `,
            [normalizedUserId, normalizedDoctorId]
        );

        if (!completedRows.length) {
            return {
                eligible: false,
                reason: "You can review this doctor after completing an appointment.",
            };
        }

        const { rows: existingReviewRows } = await pool.query(
            `
              SELECT id FROM reviews WHERE patient_id = $1 AND doctor_id = $2 LIMIT 1
            `,
            [normalizedUserId, normalizedDoctorId]
        );

        if (existingReviewRows.length > 0) {
            return {
                eligible: false,
                reason: "You have already reviewed this doctor.",
            };
        }

        return {
            eligible: true,
            reason: "",
        };
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error checking doctor review eligibility:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getHospitalReviewEligibility = async (hospitalId, userId) => {
    const normalizedHospitalId = normalizeEntityId(hospitalId, "hospital id");
    const normalizedUserId = normalizeEntityId(userId, "user id");

    try {
        const { rows: completedRows } = await pool.query(
            `
              SELECT 1 FROM appointments WHERE patient_id = $1 AND hospital_id = $2 AND LOWER(status::text) = 'completed' LIMIT 1
            `,
            [normalizedUserId, normalizedHospitalId]
        );

        if (!completedRows.length) {
            return {
                eligible: false,
                reason: "You can review this hospital after completing an appointment here.",
            };
        }

        const { rows: existingReviewRows } = await pool.query(
            `
              SELECT id FROM reviews WHERE patient_id = $1 AND hospital_id = $2 LIMIT 1
            `,
            [normalizedUserId, normalizedHospitalId]
        );

        if (existingReviewRows.length > 0) {
            return {
                eligible: false,
                reason: "You have already reviewed this hospital.",
            };
        }

        return {
            eligible: true,
            reason: "",
        };
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error checking hospital review eligibility:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const updateMyReview = async (reviewId, userId, rating, comment) => {
    const normalizedReviewId = normalizeEntityId(reviewId, "review id");
    const normalizedUserId = normalizeEntityId(userId, "user id");
    const normalizedRating = normalizeRating(rating);
    const normalizedComment = String(comment || "").trim() || null;

    try {
        const { rows } = await pool.query(
            `
              UPDATE reviews
              SET rating = $1,
                  comment = $2,
                  updated_at = NOW()
              WHERE id = $3
                AND patient_id = $4
              RETURNING id AS review_id, rating, comment, created_at, updated_at, doctor_id, hospital_id
            `,
            [normalizedRating, normalizedComment, normalizedReviewId, normalizedUserId]
        );

        if (!rows.length) {
            const error = new Error("Review not found.");
            error.status = 404;
            throw error;
        }

        return mapReviewRow(rows[0]);
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error updating review:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const deleteMyReview = async (reviewId, userId) => {
    const normalizedReviewId = normalizeEntityId(reviewId, "review id");
    const normalizedUserId = normalizeEntityId(userId, "user id");

    try {
        const { rows } = await pool.query(
            `
              DELETE FROM reviews
              WHERE id = $1
                AND patient_id = $2
              RETURNING id
            `,
            [normalizedReviewId, normalizedUserId]
        );

        if (!rows.length) {
            const error = new Error("Review not found.");
            error.status = 404;
            throw error;
        }

        return { review_id: rows[0].id };
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error deleting review:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const deleteReview = async (entityId, userId, entity) => {
    const normalizedEntityId = normalizeEntityId(entityId, `${entity} id`);
    const normalizedUserId = normalizeEntityId(userId, "user id");

    try {
        const { rows } = await pool.query(
            entity === "doctor"
                ? `
                    DELETE FROM reviews
                    WHERE patient_id = $1
                      AND doctor_id = $2
                    RETURNING id
                  `
                : `
                    DELETE FROM reviews
                    WHERE patient_id = $1
                      AND hospital_id = $2
                    RETURNING id
                  `,
            [normalizedUserId, normalizedEntityId]
        );

        if (!rows.length) {
            const error = new Error("Review not found.");
            error.status = 404;
            throw error;
        }

        return { review_id: rows[0].id };
    } catch (error) {
        if (error?.status) throw error;
        console.error("Error deleting review:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};
