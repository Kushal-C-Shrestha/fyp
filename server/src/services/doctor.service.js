import pool from "../config/db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import {
    isNonEmptyString,
    isValidEmail,
    isValidPhone,
    isValidPassword,
} from "../utils/validation.js";
import { generateSlots } from '../utils/slot.util.js'

dotenv.config();

const getAllDoctors = async () => {
    try {
        const { rows } = await pool.query(`
                SELECT
                    u.id AS user_id,
                    u.full_name AS user_name,
                    u.email AS user_email,
                    u.profile_picture AS user_profile,
                    u.address,
                    d.description AS doctor_description,
                    d.experience_years AS doctor_experience,
                    COALESCE((
                        SELECT STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name)
                        FROM doctor_specializations ds
                        JOIN specializations s ON s.id = ds.specialization_id
                        WHERE ds.doctor_id = d.id
                    ), 'General Medicine') AS specialization_name,
                    (
                        SELECT a.hospital_id
                        FROM doctor_hospital_assignments a
                        WHERE a.doctor_id = d.id
                        ORDER BY a.created_at ASC NULLS LAST, a.id ASC
                        LIMIT 1
                    ) AS hospital_id,
                    COALESCE((
                        SELECT h.full_name
                        FROM doctor_hospital_assignments a
                        LEFT JOIN hospitals h ON h.id = a.hospital_id
                        WHERE a.doctor_id = d.id
                        ORDER BY a.created_at ASC NULLS LAST, a.id ASC
                        LIMIT 1
                    ), 'Hospital unavailable') AS hospital_name,
                    COALESCE((
                        SELECT ROUND(AVG(r.rating)::numeric, 2)
                        FROM reviews r
                        WHERE r.doctor_id = d.id
                    ), 0) AS avg_rating,
                    (
                        SELECT COUNT(r.id)
                        FROM reviews r
                        WHERE r.doctor_id = d.id
                    ) AS review_count,
                    COALESCE((
                        SELECT JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'hospital_id', schedule_rows.hospital_id,
                                'hospital_name', schedule_rows.hospital_name,
                                'start_time', schedule_rows.start_time,
                                'end_time', schedule_rows.end_time,
                                'consultation_fee', schedule_rows.consultation_fee
                            )
                            ORDER BY schedule_rows.hospital_name ASC, schedule_rows.start_time ASC NULLS LAST
                        )
                        FROM (
                            SELECT
                                a.hospital_id,
                                COALESCE(h.full_name, 'Hospital unavailable') AS hospital_name,
                                MIN(av.start_time) AS start_time,
                                MAX(av.end_time) AS end_time,
                                a.fee AS consultation_fee
                            FROM doctor_hospital_assignments a
                            LEFT JOIN hospitals h ON h.id = a.hospital_id
                            LEFT JOIN assignment_availability av ON av.assignment_id = a.id
                            WHERE a.doctor_id = d.id
                            GROUP BY a.hospital_id, h.full_name, a.fee
                        ) schedule_rows
                    ), '[]'::json) AS hospital_timings
                FROM doctors d
                JOIN users u ON u.id = d.id
                WHERE LOWER(COALESCE(u.status::text, 'active')) = 'active'
                ORDER BY review_count DESC, u.full_name ASC
        `);

        return rows.map((doc) => {
            const mapped = {
                id: doc.user_id,
                name: doc.user_name || "Doctor",
                email: doc.user_email || "",
                profilePicture: doc.user_profile || "",
                specialization: doc.specialization_name || "General Medicine",
                experienceYears: Number(doc.doctor_experience || 0),
                hospitalId: doc.hospital_id ?? null,
                hospitalName: doc.hospital_name || "Hospital unavailable",
                description: doc.doctor_description || "",
                rating: parseFloat(doc.avg_rating) || 0,
                reviewCount: parseInt(doc.review_count, 10) || 0,
                address: doc.address || "",
                hospitalTimings: Array.isArray(doc.hospital_timings)
                    ? doc.hospital_timings
                    : [],
            };

            return {
                ...mapped,
                user_id: mapped.id,
                user_name: mapped.name,
                user_email: mapped.email,
                user_profile: mapped.profilePicture,
                specialization_name: mapped.specialization,
                doctor_description: mapped.description,
                doctor_experience: mapped.experienceYears,
                hospital_id: mapped.hospitalId,
                hospital_name: mapped.hospitalName,
                avg_rating: mapped.rating,
                review_count: mapped.reviewCount,
                hospital_timings: mapped.hospitalTimings,
            };
        });
    } catch (error) {
        console.error("Error fetching doctors:", error);
        const err = new Error(error.message || "Failed to fetch doctors.");
        err.status = 500;
        throw err;
    }
};

const getDoctorById = async (doctorId) => {
    if (!doctorId || isNaN(doctorId)) {
        throw { message: "Invalid doctor ID", status: 400 };
    }
    const id = Number.parseInt(doctorId, 10);

    if (!Number.isInteger(id)) {
        const error = new Error("Invalid doctor id.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows: doctorRows } = await pool.query(
            `
                SELECT 
                d.id,
                u.full_name, 
                u.address,
                d.experience_years, 
                d.description, 
                u.profile_picture, 
                dq.degree_name, 
                dq.institution, 
                de.organization,
                de.position, 
                de.start_date, 
                de.end_date,
                s.id AS specialization_id,
                s.name AS specialization_name,
                dha.hospital_id,
                dha.fee AS consultation_fee,
                h.full_name AS hospital_name,
                h.address AS hospital_address,
                aa.assignment_id,
                aa.day_of_week,
                aa.start_time, 
                aa.end_time,
                aa.slot_interval_minutes,
                r.review_id,
                r.rating,
                r.comment,
                r.review_date,
                r.reviewer_name,
                r.reviewer_picture,
                (
                    SELECT COUNT(*)
                    FROM reviews
                    WHERE doctor_id = d.id
                ) AS review_count,
                (
                    SELECT ROUND(AVG(rating)::numeric, 1)
                    FROM reviews
                    WHERE doctor_id = d.id
                ) AS avg_rating
                FROM users u 
                JOIN doctors d ON d.id = u.id 
                LEFT JOIN doctor_qualifications dq ON dq.doctor_id = d.id
                LEFT JOIN doctor_experience de ON de.doctor_id = d.id
                LEFT JOIN doctor_specializations ds ON ds.doctor_id = d.id 
                LEFT JOIN specializations s ON ds.specialization_id = s.id
                LEFT JOIN doctor_hospital_assignments dha ON dha.doctor_id = d.id
                LEFT JOIN hospitals h ON dha.hospital_id = h.id
                LEFT JOIN assignment_availability aa ON dha.id = aa.assignment_id
                LEFT JOIN LATERAL (
                SELECT 
                    r.id AS review_id,
                    r.rating,
                    r.comment,
                    r.created_at AS review_date,
                    reviewer.full_name AS reviewer_name,
                    reviewer.profile_picture AS reviewer_picture
                FROM reviews r
                JOIN users reviewer ON reviewer.id = r.patient_id
                WHERE r.doctor_id = d.id
                ORDER BY r.created_at DESC
                LIMIT 3
                ) r ON true
                WHERE d.id = $1
            `,
            [id],
        );

        if (doctorRows.length === 0) {
            const error = new Error("Doctor not found.");
            error.status = 404;
            throw error;
        }


        // Creating the doctor object to send to frontend.
        const doctor = {
            id: doctorRows[0].id,
            name: doctorRows[0].full_name,
            address: doctorRows[0].address || "",
            experience: doctorRows[0].experience_years,
            description: doctorRows[0].description,
            profile_picture: doctorRows[0].profile_picture,
            review_count: doctorRows[0].review_count || 0,
            avg_rating: parseFloat(doctorRows[0].avg_rating) || 0,
            specializations: [],
            qualifications: [],
            work_experience: [],
            hospitals: {},
            reviews: {},
        };

        // Mapping nested data 
        doctorRows.forEach((row) => {
            if (row.specialization_id && !doctor.specializations.some(s => s.specializationId === row.specialization_id && s.specializationName === row.specialization_name)) {
                doctor.specializations.push({
                    specializationId: row.specialization_id,
                    specializationName: row.specialization_name
                });
            }

            if (row.degree_name && row.institution && !doctor.qualifications.some(q => q.degree === row.degree_name && q.institution === row.institution)) {
                doctor.qualifications.push({
                    degree: row.degree_name,
                    institution: row.institution,
                    graduationDate: row.graduation_date,
                });
            }

            if (row.organization && row.position && !doctor.work_experience.some(w => w.organization === row.organization && w.position === row.position)) {
                doctor.work_experience.push({
                    organization: row.organization,
                    position: row.position,
                    startDate: row.start_date,
                    endDate: row.end_date,
                });
            }

            if (row.hospital_name) {
                if (!doctor.hospitals[row.hospital_name]) {
                    doctor.hospitals[row.hospital_name] = {
                        hospital_id: row.hospital_id,
                        hospital_name: row.hospital_name,
                        hospital_address: row.hospital_address,
                        consultation_fee: row.consultation_fee,
                        schedule: {}
                    };
                }
                if (row.assignment_id && row.day_of_week) {
                    const scheduleKey = `${row.assignment_id} ${row.day_of_week}`;
                    doctor.hospitals[row.hospital_name].schedule[scheduleKey] = {
                        assignment_id: row.assignment_id,
                        day_of_week: row.day_of_week,
                        start_time: row.start_time,
                        end_time: row.end_time,
                        slot_interval_minutes: row.slot_interval_minutes
                    };
                }
                if (row.review_id && !doctor.reviews[row.review_id]) {
                    doctor.reviews[row.review_id] = {
                        review_id: row.review_id,
                        rating: row.rating,
                        comment: row.comment,
                        review_date: row.review_date,
                        reviewer_name: row.reviewer_name,
                        reviewer_picture: row.reviewer_picture ?? null
                    };
                }
            }
        });

        // Converting objects to arrays for frontend .
        const result = {
            ...doctor,
            hospitals: Object.values(doctor.hospitals).map(h => ({
                ...h,
                schedule: Object.values(h.schedule)
            })),
            reviews: Object.values(doctor.reviews)
        };

        return { success: true, doctor: result };

    } catch (error) {
        if (error?.status) throw error;
        console.error("Error fetching doctor:", error);
        const err = new Error("Failed to fetch doctor.");
        err.status = 500;
        throw err;
    }
};

const getDoctorFromSingleHospital = async (hospitalId) => {
    const id = Number.parseInt(hospitalId, 10);

    if (!Number.isInteger(id)) {
        const error = new Error("Invalid hospital id.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
                SELECT
                    u.id AS user_id,
                    u.full_name AS user_name,
                    u.email AS user_email,
                    u.profile_picture AS user_profile,
                    u.address,
                    d.description AS doctor_description,
                    d.experience_years AS doctor_experience,
                    (
                        SELECT a.id
                        FROM doctor_hospital_assignments a
                        WHERE a.doctor_id = d.id
                          AND a.hospital_id = $1
                        LIMIT 1
                    ) AS assignment_id,
                    COALESCE((
                        SELECT STRING_AGG(DISTINCT s.name, ', ' ORDER BY s.name)
                        FROM doctor_specializations ds
                        JOIN specializations s ON s.id = ds.specialization_id
                        WHERE ds.doctor_id = d.id
                    ), 'General Medicine') AS specialization_name,
                    $1::int AS hospital_id,
                    COALESCE((
                        SELECT h.full_name
                        FROM doctor_hospital_assignments a
                        LEFT JOIN hospitals h ON h.id = a.hospital_id
                        WHERE a.doctor_id = d.id
                          AND a.hospital_id = $1
                        ORDER BY a.created_at ASC NULLS LAST, a.id ASC
                        LIMIT 1
                    ), 'Hospital unavailable') AS hospital_name,
                    COALESCE((
                        SELECT ROUND(AVG(r.rating)::numeric, 2)
                        FROM reviews r
                        WHERE r.doctor_id = d.id
                    ), 0) AS avg_rating,
                    (
                        SELECT COUNT(r.id)
                        FROM reviews r
                        WHERE r.doctor_id = d.id
                    ) AS review_count,
                    COALESCE((
                        SELECT JSON_AGG(
                            JSON_BUILD_OBJECT(
                                'hospital_id', schedule_rows.hospital_id,
                                'hospital_name', schedule_rows.hospital_name,
                                'start_time', schedule_rows.start_time,
                                'end_time', schedule_rows.end_time,
                                'timing',
                                    CASE
                                        WHEN schedule_rows.start_time IS NOT NULL AND schedule_rows.end_time IS NOT NULL
                                        THEN schedule_rows.start_time::text || ' - ' || schedule_rows.end_time::text
                                        ELSE ''
                                    END
                            )
                            ORDER BY schedule_rows.hospital_name ASC, schedule_rows.start_time ASC NULLS LAST
                        )
                        FROM (
                            SELECT
                                a.hospital_id,
                                COALESCE(h.full_name, 'Hospital unavailable') AS hospital_name,
                                MIN(av.start_time) AS start_time,
                                MAX(av.end_time) AS end_time
                            FROM doctor_hospital_assignments a
                            LEFT JOIN hospitals h ON h.id = a.hospital_id
                            LEFT JOIN assignment_availability av ON av.assignment_id = a.id
                            WHERE a.doctor_id = d.id
                              AND a.hospital_id = $1
                            GROUP BY a.hospital_id, h.full_name
                        ) schedule_rows
                    ), '[]'::json) AS hospital_timings
                FROM doctors d
                JOIN users u ON u.id = d.id
                WHERE EXISTS (
                    SELECT 1
                    FROM doctor_hospital_assignments a
                    WHERE a.doctor_id = d.id
                      AND a.hospital_id = $1
                )
                ORDER BY avg_rating DESC, u.full_name ASC
            `,
            [id],
        );

        return rows.map((doc) => ({
            user_id: doc.user_id,
            id: doc.user_id,
            assignment_id: doc.assignment_id,
            user_name: doc.user_name || "Doctor",
            name: doc.user_name || "Doctor",
            user_email: doc.user_email || "",
            user_profile: doc.user_profile || "",
            user_profile_picture: doc.user_profile || "",
            image: doc.user_profile || "",
            profile: doc.user_profile || "",
            specialization_name: doc.specialization_name || "General Medicine",
            specialty: doc.specialization_name || "General Medicine",
            doctor_experience: Number(doc.doctor_experience || 0),
            experience: Number(doc.doctor_experience || 0),
            hospital_id: doc.hospital_id ?? null,
            hospital_name: doc.hospital_name || "Hospital unavailable",
            hospital: doc.hospital_name || "Hospital unavailable",
            doctor_description: doc.doctor_description || "",
            description: doc.doctor_description || "",
            avg_rating: parseFloat(doc.avg_rating) || 0,
            rating: parseFloat(doc.avg_rating) || 0,
            review_count: parseInt(doc.review_count, 10) || 0,
            reviewCount: parseInt(doc.review_count, 10) || 0,
            address: doc.address || "",
            location: doc.address || "",
            price: (() => { const fees = (doc.hospital_timings || []).map(t => parseFloat(t.consultation_fee || 0)).filter(f => f > 0); return fees.length > 0 ? Math.min(...fees) : 0; })(),
            doctor_consultation_fee: (() => { const fees = (doc.hospital_timings || []).map(t => parseFloat(t.consultation_fee || 0)).filter(f => f > 0); return fees.length > 0 ? Math.min(...fees) : 0; })(),
            hospital_timings: Array.isArray(doc.hospital_timings)
                ? doc.hospital_timings
                : [],
        }));
    } catch (error) {
        console.error("Error fetching doctors for hospital:", error);
        const err = new Error(error.message || "Failed to fetch doctors.");
        err.status = 500;
        throw err;
    }
};

const searchDoctors = async ({
    q,
    gender,
    specializationId,
    hospitalId,
    sort,
    order,
    exclude
}) => {
    try {
        let doctors = await getAllDoctors();
        if (q) {
            const searchText = q.toLowerCase();
            const queryTerms = searchText.split(/\s+/).filter(Boolean);
            const filtered = [];
            doctors.forEach((doctor) => {
                const matchesAllTerms = queryTerms.every((term) => {
                    if (doctor.name && doctor.name.toLowerCase().includes(term)) {
                        return true;
                    }
                    if (doctor.specialization) {
                        const specName = doctor.specialization.toLowerCase();
                        const specList = specName.split(/\s*,\s*/);
                        const isSpecMatch = specList.some((spec) =>
                            spec.includes(term) ||
                            (term.endsWith("ist") && spec.includes(term.slice(0, -3))) ||
                            (term.endsWith("ian") && spec.includes(term.slice(0, -3))) ||
                            (spec.endsWith("y") && term.includes(spec.slice(0, -1))) ||
                            (spec.endsWith("ics") && term.includes(spec.slice(0, -3)))
                        );
                        if (isSpecMatch) return true;
                    }
                    if (doctor.hospitalName && doctor.hospitalName.toLowerCase().includes(term)) {
                        return true;
                    }
                    if (doctor.address && doctor.address.toLowerCase().includes(term)) {
                        return true;
                    }
                    return false;
                });

                if (matchesAllTerms) {
                    filtered.push(doctor);
                }
            });
            doctors = filtered;
        }

        if (gender) {
            const genderText = gender.toLowerCase();
            const { rows } = await pool.query(
                "SELECT id FROM users WHERE LOWER(gender::text) = $1",
                [genderText],
            );

            const validIds = [];
            rows.forEach((row) => {
                validIds.push(row.id);
            });

            const filtered = [];
            doctors.forEach((doctor) => {
                if (validIds.includes(doctor.id)) {
                    filtered.push(doctor);
                }
            });
            doctors = filtered;
        }

        if (specializationId) {
            const specArray = String(specializationId).split(",");
            const { rows } = await pool.query(
                "SELECT doctor_id, specialization_id FROM doctor_specializations",
            );

            const validIds = [];
            rows.forEach((row) => {
                const rowSpecIdString = String(row.specialization_id);
                if (specArray.includes(rowSpecIdString)) {
                    validIds.push(row.doctor_id);
                }
            });

            const filtered = [];
            doctors.forEach((doctor) => {
                if (validIds.includes(doctor.id)) {
                    filtered.push(doctor);
                }
            });
            doctors = filtered;
        }

        if (hospitalId) {
            const hospId = parseInt(hospitalId);
            const filtered = [];
            doctors.forEach((doctor) => {
                if (doctor.hospitalId === hospId) {
                    filtered.push(doctor);
                }
            });
            doctors = filtered;
        }

        if (sort === "name") {
            if (order === "ASC") {
                doctors.sort((a, b) => {
                    const nameA = String(a.name || "").toLowerCase();
                    const nameB = String(b.name || "").toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            } else {
                doctors.sort((a, b) => {
                    const nameA = String(a.name || "").toLowerCase();
                    const nameB = String(b.name || "").toLowerCase();
                    return nameB.localeCompare(nameA);
                });
            }
        } else {
            if (order === "ASC") {
                doctors.sort((a, b) => {
                    if (a.rating < b.rating) return -1;
                    if (a.rating > b.rating) return 1;
                    return 0;
                });
            } else {
                doctors.sort((a, b) => {
                    if (a.rating > b.rating) return -1;
                    if (a.rating < b.rating) return 1;
                    return 0;
                });
            }
        }

        if (exclude) {
            doctors = doctors.filter((doctor) => Number(doctor.id) !== Number(exclude))
        }
        return doctors;
    } catch (error) {
        console.error("Error searching doctors:", error);
        throw error;
    }
};

const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (value === null || value === undefined || value === "") return [];
    try {
        const parsed = JSON.parse(String(value));
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const normalizeDayName = (value = "") => {
    const normalized = String(value || "").trim().toLowerCase();
    const day = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
        .find((item) => item.toLowerCase() === normalized);
    return day || "";
};

const normalizeTimeValue = (value = "") => {
    const match = String(value || "").trim().match(/^([01]?\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    if (!match) return "";
    return `${match[1].padStart(2, "0")}:${match[2]}`;
};

const normalizeHospitalAffiliations = (value) => {
    return parseJsonArray(value)
        .map((item) => {
            const hospitalId = Number.parseInt(item?.hospitalId ?? item?.hospital_id, 10);
            const schedule = parseJsonArray(item?.schedule)
                .map((slot) => ({
                    day: normalizeDayName(slot?.day ?? slot?.dayOfWeek ?? slot?.day_of_week),
                    startTime: normalizeTimeValue(slot?.startTime ?? slot?.start_time),
                    endTime: normalizeTimeValue(slot?.endTime ?? slot?.end_time),
                    slotIntervalMinutes: Number.parseInt(slot?.slotIntervalMinutes ?? slot?.slot_interval_minutes ?? slot?.slotInterval, 10) || 30,
                }))
                .filter((slot) => slot.day && slot.startTime && slot.endTime && slot.startTime < slot.endTime);

            return { hospitalId, schedule };
        })
        .filter((item) => Number.isInteger(item.hospitalId) && item.hospitalId > 0);
};

const getBookedAppointmentsForDoctor = async (doctorId) => {
    try {
        const { rows } = await pool.query(
            `
                SELECT
                    a.id AS appointment_id,
                    a.patient_id,
                    u.full_name AS patient_name,
                    u.profile_picture AS patient_profile,
                    a.hospital_id,
                    h.full_name AS hospital_name,
                    a.appointment_date::text AS appointment_date,
                    a.appointment_time,
                    a.status
                FROM appointments a
                JOIN users u ON u.id = a.patient_id
                JOIN hospitals h ON h.id = a.hospital_id
                WHERE a.doctor_id = $1
                  AND LOWER(a.status::text) IN ('scheduled', 'pending')
                  AND a.appointment_date>= CURRENT_DATE
                  AND a.appointment_date<= CURRENT_DATE + INTERVAL '14 days'
                ORDER BY a.appointment_date ASC, a.appointment_time ASC
            `,
            [doctorId],
        );

        return { bookedAppointments: rows };
    } catch (error) {
        console.error("Error fetching booked appointments for doctor:", error);
        const err = new Error("Failed to fetch booked appointments.");
        err.status = 500;
        throw err;
    }
};

const getApprovedLeavesForDoctor = async (doctorId) => {
    try {
        const { rows } = await pool.query(
            `
                SELECT 
                    lr.assignment_id,
                    lr.start_date::text as start_date,
                    lr.end_date::text as end_date,
                    lr.leave_type,
                    lr.start_time,
                    lr.end_time
                FROM leave_requests lr
                JOIN doctor_hospital_assignments dha ON dha.id = lr.assignment_id
                WHERE dha.doctor_id = $1
                  AND lr.status = 'approved'
                  AND lr.end_date >= CURRENT_DATE
            `,
            [doctorId]
        );
        return rows;
    } catch (error) {
        console.error("Error fetching approved leaves for doctor:", error);
        return [];
    }
};

const generateAvailableSlots = async (doctor_id, date) => {
    if (!doctor_id) {
        const error = new Error("Doctor missing.")
        error.status = 400;
        throw error;
    }

    try {
        const { doctor } = await getDoctorById(doctor_id);

        if (!doctor) {
            const error = new Error("Doctor not found.");
            error.status = 404;
            throw error;
        }

        const { bookedAppointments } = await getBookedAppointmentsForDoctor(doctor_id);
        const leaves = await getApprovedLeavesForDoctor(doctor_id);

        const slots = generateSlots(doctor.hospitals, bookedAppointments, leaves);
        if (date) {
            return slots.map((hospital) => ({
                ...hospital,
                days: hospital.days.filter((d) => d.dateStr === date),
            }));
        }
        return slots;

    } catch (error) {
        console.error("Error fetching booked appointments for doctor:", error);
        const err = new Error("Failed to fetch booked appointments.");
        err.status = 500;
        throw err;
    }
}

const registerDoctorRequest = async ({ body, files }) => {
    const client = await pool.connect();

    try {
        const {
            doctorName,
            doctorEmail,
            doctorPhone,
            doctorDob,
            doctorGender,
            doctorDescription,
            doctorPassword,
            confirmPassword,
            specializationId,
            doctorExperience,
            qualification,
            workExperience,
            hospitalAffiliations,
            medicalLicenseNumber,
            doctorAddress,
        } = body;

        let parsedSpecializationIds = [];
        if (typeof specializationId === "string") {
            try {
                const parsed = JSON.parse(specializationId);
                parsedSpecializationIds = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
                parsedSpecializationIds = [specializationId];
            }
        } else if (Array.isArray(specializationId)) {
            parsedSpecializationIds = specializationId;
        }

        parsedSpecializationIds = parsedSpecializationIds
            .map((value) => Number.parseInt(value, 10))
            .filter((value) => Number.isInteger(value) && value > 0);

        let parsedQualifications = [];
        if (typeof qualification === "string") {
            try {
                parsedQualifications = JSON.parse(qualification);
            } catch {
                parsedQualifications = [];
            }
        } else if (Array.isArray(qualification)) {
            parsedQualifications = qualification;
        }

        let parsedWorkExperience = [];
        if (typeof workExperience === "string") {
            try {
                parsedWorkExperience = JSON.parse(workExperience);
            } catch {
                parsedWorkExperience = [];
            }
        } else if (Array.isArray(workExperience)) {
            parsedWorkExperience = workExperience;
        }

        const parsedHospitalAffiliations = normalizeHospitalAffiliations(hospitalAffiliations);
        const citizenshipFront = Array.isArray(files?.citizenshipFront)
            ? files.citizenshipFront
            : [];
        const citizenshipBack = Array.isArray(files?.citizenshipBack)
            ? files.citizenshipBack
            : [];
        const medicalLicenseCertificate = Array.isArray(
            files?.medicalLicenseCertificate,
        )
            ? files.medicalLicenseCertificate
            : [];
        const degreeCertificate = Array.isArray(files?.degreeCertificate)
            ? files.degreeCertificate
            : [];
        const additionalCertificates = Array.isArray(files?.additionalCertificates)
            ? files.additionalCertificates
            : [];

        if (
            !isNonEmptyString(doctorName) ||
            !isNonEmptyString(doctorEmail) ||
            !isNonEmptyString(doctorPhone) ||
            !isNonEmptyString(doctorDob) ||
            !isNonEmptyString(doctorGender) ||
            !isNonEmptyString(doctorDescription) ||
            !isNonEmptyString(doctorPassword) ||
            !isNonEmptyString(confirmPassword) ||
            !isNonEmptyString(medicalLicenseNumber) ||
            !doctorExperience ||
            parsedSpecializationIds.length === 0 ||
            parsedQualifications.length === 0 ||
            parsedHospitalAffiliations.length === 0 ||
            parsedHospitalAffiliations.some((item) => item.schedule.length === 0) ||
            citizenshipFront.length === 0 ||
            citizenshipBack.length === 0 ||
            medicalLicenseCertificate.length === 0 ||
            degreeCertificate.length === 0
        ) {
            const error = new Error("Required fields are missing.");
            error.status = 400;
            throw error;
        }

        if (doctorPassword !== confirmPassword) {
            const error = new Error("Passwords do not match.");
            error.status = 400;
            throw error;
        }

        if (!isValidEmail(doctorEmail)) {
            const error = new Error("Invalid email format.");
            error.status = 400;
            throw error;
        }

        if (!isValidPhone(doctorPhone)) {
            const error = new Error("Invalid phone number format.");
            error.status = 400;
            throw error;
        }

        if (!isValidPassword(doctorPassword)) {
            const error = new Error("Invalid password format.");
            error.status = 400;
            throw error;
        }

        const hashedPassword = await bcrypt.hash(
            doctorPassword,
            Number(process.env.SALT_ROUNDS || 10),
        );

        await client.query("BEGIN");

        const { rows } = await client.query(
            `
                INSERT INTO doctor_requests (
                    full_name,
                    email,
                    phone,
                    password,
                    date_of_birth,
                    gender,
                    address,
                    profile_picture,
                    status,
                    role,
                    description,
                    experience_years,
                    license_number,
                    approval_status,
                    request_note
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, 'active', 'doctor', $8, $9, $10, 'pending', NULL)
                RETURNING id
            `,
            [
                doctorName,
                String(doctorEmail).trim().toLowerCase(),
                doctorPhone,
                hashedPassword,
                doctorDob,
                String(doctorGender).trim().toLowerCase(),
                doctorAddress || "Not provided",
                doctorDescription,
                Number.parseInt(doctorExperience, 10) || 0,
                medicalLicenseNumber,
            ],
        );

        const requestId = rows[0]?.id;

        for (const id of parsedSpecializationIds) {
            await client.query(
                `
                    INSERT INTO doctor_request_specializations (request_id, specialization_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `,
                [requestId, id],
            );
        }

        const fallbackGraduationDate =
            doctorDob || new Date().toISOString().slice(0, 10);

        for (const item of parsedQualifications) {
            await client.query(
                `
                    INSERT INTO doctor_request_qualifications (request_id, degree_name, institution, graduation_date)
                    VALUES ($1, $2, $3, $4)
                `,
                [
                    requestId,
                    String(
                        item?.degreeName ||
                        item?.name ||
                        item?.degree_name ||
                        "Qualification",
                    ).trim(),
                    String(item?.institution || "Not provided").trim(),
                    String(
                        item?.graduationDate ||
                        item?.graduation_date ||
                        fallbackGraduationDate,
                    ).trim(),
                ],
            );
        }

        for (const item of parsedWorkExperience) {
            await client.query(
                `
                    INSERT INTO doctor_request_experience (request_id, organization, position, start_date, end_date)
                    VALUES ($1, $2, $3, $4, $5)
                `,
                [
                    requestId,
                    String(
                        item?.institute || item?.organization || "Not provided",
                    ).trim(),
                    String(item?.post || item?.position || "Not provided").trim(),
                    String(item?.startDate || item?.start_date || doctorDob).trim(),
                    String(item?.endDate || item?.end_date || "").trim() || null,
                ],
            );
        }

        for (const affiliation of parsedHospitalAffiliations) {
            const { rows: requestHospitalRows } = await client.query(
                `
                    INSERT INTO doctor_request_hospitals (request_id, hospital_id)
                    VALUES ($1, $2)
                    ON CONFLICT (request_id, hospital_id)
                    DO UPDATE SET updated_at = NOW()
                    RETURNING id
                `,
                [requestId, affiliation.hospitalId],
            );

            const requestHospitalId = requestHospitalRows[0]?.id;
            for (const slot of affiliation.schedule) {
                await client.query(
                    `
                        INSERT INTO doctor_request_hospital_schedule (
                            doctor_request_hospital_id,
                            day_of_week,
                            start_time,
                            end_time,
                            slot_interval_minutes
                        )
                        VALUES ($1, $2, $3::time, $4::time, $5)
                        ON CONFLICT (doctor_request_hospital_id, day_of_week, start_time)
                        DO UPDATE SET
                            end_time = EXCLUDED.end_time,
                            slot_interval_minutes = EXCLUDED.slot_interval_minutes
                    `,
                    [requestHospitalId, slot.day, slot.startTime, slot.endTime, slot.slotIntervalMinutes],
                );
            }
        }

        const allDocuments = [
            ...citizenshipFront.map((file) => ({ type: "Citizenship Front", file })),
            ...citizenshipBack.map((file) => ({ type: "Citizenship Back", file })),
            ...medicalLicenseCertificate.map((file) => ({
                type: "Medical License",
                file,
            })),
            ...degreeCertificate.map((file) => ({
                type: "Degree Certificate",
                file,
            })),
            ...additionalCertificates.map((file) => ({
                type: "Additional Certificate",
                file,
            })),
        ];

        for (const document of allDocuments) {
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
                    VALUES ('doctor_request', $1, NULL, NULL, $2, $3, $4, $5, $6, 'pending')
                `,
                [
                    requestId,
                    document.type,
                    document.file?.location || document.file?.path || "",
                    document.file?.originalname || "",
                    String(document.file?.size || ""),
                    document.file?.mimetype || "",
                ],
            );
        }

        await client.query("COMMIT");
        return { message: "Doctor request submitted successfully." };
    } catch (error) {
        await client.query("ROLLBACK");

        if (error?.code === "23505") {
            const constraint = String(error.constraint || "").toLowerCase();
            if (constraint.includes("email")) {
                error.message = "Email already exists.";
                error.status = 409;
            } else if (constraint.includes("phone")) {
                error.message = "Phone already exists.";
                error.status = 409;
            } else if (constraint.includes("license")) {
                error.message = "License number already exists.";
                error.status = 409;
            }
        }

        if (!error.status) {
            console.error("Error in doctor request registration:", error);
            error.status = 500;
            error.message = error.message || "Internal server error.";
        }

        throw error;
    } finally {
        client.release();
    }
};

const completeDoctorRequest = async (requestId, status, doctorRequest) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `
                UPDATE doctor_requests
                SET approval_status = $1::approval_status_enum
                WHERE id = $2
            `,
            [status, requestId],
        );

        if (status === "rejected") {
            await client.query("COMMIT");
            return { success: true, message: "Doctor request rejected successfully." };
        }

        const { rows: existingUserRows } = await client.query(
            `
                SELECT id
                FROM users
                WHERE LOWER(email) = LOWER($1) OR phone = $2
                LIMIT 1
            `,
            [doctorRequest.email, doctorRequest.phone],
        );

        if (existingUserRows.length > 0) {
            await client.query("ROLLBACK");
            return {
                success: false,
                message: "A user account already exists for this doctor request.",
            };
        }

        const { rows: userRows } = await client.query(
            `
                INSERT INTO users (
                    full_name,
                    email,
                    phone,
                    password,
                    role,
                    gender,
                    date_of_birth,
                    address,
                    profile_picture,
                    status
                )
                VALUES ($1, $2, $3, $4, 'doctor', $5, $6, $7, $8, 'active')
                RETURNING id
            `,
            [
                doctorRequest.full_name,
                doctorRequest.email,
                doctorRequest.phone,
                doctorRequest.password,
                doctorRequest.gender,
                doctorRequest.date_of_birth,
                doctorRequest.address,
                doctorRequest.profile_picture,
            ],
        );

        const userId = userRows[0]?.id;

        await client.query(
            `
                INSERT INTO doctors (id, description, experience_years, license_number)
                VALUES ($1, $2, $3, $4)
            `,
            [
                userId,
                doctorRequest.description,
                doctorRequest.experience_years,
                doctorRequest.license_number,
            ],
        );

        const { rows: specializationRows } = await client.query(
            `
                SELECT specialization_id
                FROM doctor_request_specializations
                WHERE request_id = $1
            `,
            [requestId],
        );

        for (const row of specializationRows) {
            await client.query(
                `
                    INSERT INTO doctor_specializations (doctor_id, specialization_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `,
                [userId, row.specialization_id],
            );
        }

        const { rows: qualificationRows } = await client.query(
            `
                SELECT degree_name, institution, graduation_date
                FROM doctor_request_qualifications
                WHERE request_id = $1
            `,
            [requestId],
        );

        for (const row of qualificationRows) {
            await client.query(
                `
                    INSERT INTO doctor_qualifications (doctor_id, degree_name, institution, graduation_date)
                    VALUES ($1, $2, $3, $4)
                `,
                [userId, row.degree_name, row.institution, row.graduation_date],
            );
        }

        const { rows: workRows } = await client.query(
            `
                SELECT organization, position, start_date, end_date
                FROM doctor_request_experience
                WHERE request_id = $1
            `,
            [requestId],
        );

        for (const row of workRows) {
            await client.query(
                `
                    INSERT INTO doctor_experience (doctor_id, organization, position, start_date, end_date)
                    VALUES ($1, $2, $3, $4, $5)
                `,
                [userId, row.organization, row.position, row.start_date, row.end_date],
            );
        }

        const { rows: requestedHospitalRows } = await client.query(
            `
                SELECT id, hospital_id
                FROM doctor_request_hospitals
                WHERE request_id = $1
            `,
            [requestId],
        );

        for (const hospitalRow of requestedHospitalRows) {
            const { rows: assignmentRows } = await client.query(
                `
                    INSERT INTO doctor_hospital_assignments (doctor_id, hospital_id)
                    VALUES ($1, $2)
                    ON CONFLICT (doctor_id, hospital_id)
                    DO UPDATE SET updated_at = NOW()
                    RETURNING id
                `,
                [userId, hospitalRow.hospital_id],
            );

            const assignmentId = assignmentRows[0]?.id;
            const { rows: scheduleRows } = await client.query(
                `
                    SELECT day_of_week, start_time, end_time, slot_interval_minutes
                    FROM doctor_request_hospital_schedule
                    WHERE doctor_request_hospital_id = $1
                `,
                [hospitalRow.id],
            );

            for (const schedule of scheduleRows) {
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
                        ON CONFLICT (assignment_id, day_of_week, start_time, end_time)
                        DO UPDATE SET slot_interval_minutes = EXCLUDED.slot_interval_minutes
                    `,
                    [
                        assignmentId,
                        schedule.day_of_week,
                        schedule.start_time,
                        schedule.end_time,
                        schedule.slot_interval_minutes,
                    ],
                );
            }
        }

        await client.query(
            `
                UPDATE verification_documents
                SET user_id = $1,
                    status = 'approved',
                    updated_at = NOW()
                WHERE doctor_request_id = $2
            `,
            [userId, requestId],
        );

        await client.query("COMMIT");
        return { success: true, message: "Doctor request verified successfully." };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Error in doctor request verification:", error);
        return { success: false, message: error.message || "Failed to process doctor request." };
    } finally {
        client.release();
    }
};

const verifyDoctorRequest = async (requestId, status, user) => {
    const id = Number.parseInt(requestId, 10);

    if (!isNonEmptyString(String(requestId || "")) || !isNonEmptyString(status)) {
        const error = new Error("All fields are required.");
        error.status = 400;
        throw error;
    }

    if (!Number.isInteger(id)) {
        const error = new Error("Invalid doctor request id.");
        error.status = 400;
        throw error;
    }

    if (status !== "approved" && status !== "rejected") {
        const error = new Error("Invalid status.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
                SELECT *
                FROM doctor_requests
                WHERE id = $1
                LIMIT 1
            `,
            [id],
        );

        if (rows.length === 0) {
            const error = new Error("Doctor request not found.");
            error.status = 404;
            throw error;
        }

        const doctorRequest = rows[0];

        if (
            String(doctorRequest.approval_status || "").toLowerCase() !== "pending"
        ) {
            const error = new Error("Doctor request is not pending.");
            error.status = 400;
            throw error;
        }

        if (doctorRequest.hospital_id != null) {
            const { rows: adminRows } = await pool.query(
                `
                    SELECT admin_id
                    FROM hospital_admin
                    WHERE hospital_id = $1
                `,
                [doctorRequest.hospital_id],
            );

            if (adminRows.length === 0) {
                const error = new Error(
                    "You are not authorized to verify this doctor request.",
                );
                error.status = 403;
                throw error;
            }

            if (
                adminRows[0].admin_id !== user?.user_id &&
                adminRows[0].admin_id !== user?.id
            ) {
                const error = new Error(
                    "You are not authorized to verify this doctor request.",
                );
                error.status = 403;
                throw error;
            }
        } else if (user?.user_role !== "admin" && user?.role !== "admin") {
            const error = new Error(
                "You are not authorized to verify this doctor request.",
            );
            error.status = 403;
            throw error;
        }

        const result = await completeDoctorRequest(id, status, doctorRequest);

        if (!result.success) {
            const error = new Error(result.message);
            error.status = 400;
            throw error;
        }

        return { message: result.message };
    } catch (error) {
        if (!error.status) {
            console.error("Error in doctor request verification:", error);
            error.status = 500;
            error.message = error.message || "Internal server error.";
        }

        throw error;
    }
};

const getDoctorSettings = async (doctorId) => {
    const { rows } = await pool.query(
        `SELECT u.id, u.full_name, u.email, u.phone, u.gender, u.date_of_birth, u.address, u.profile_picture,
                d.experience_years, d.description
         FROM users u 
         LEFT JOIN doctors d ON d.id = u.id 
         WHERE u.id = $1 LIMIT 1`,
        [doctorId]
    );

    if (rows.length === 0) {
        throw { status: 404, message: "Doctor not found." };
    }

    const doc = rows[0];

    return {
        account: {
            fullName: doc.full_name,
            email: doc.email,
            phone: doc.phone,
            gender: doc.gender,
            dateOfBirth: doc.date_of_birth,
            address: doc.address,
            profile_picture: doc.profile_picture || "",
        },
        professional: {
            specialization: "",
            yearsExperience: doc.experience_years,
            profileSummary: doc.description,
        }
    };
};

const updateDoctorSettings = async (doctorId, payload) => {
    const { account, professional, security } = payload;
    const client = await pool.connect();
    const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);

    try {
        await client.query("BEGIN");

        if (account) {
            await client.query(
                `UPDATE users SET
                  full_name = COALESCE($1, full_name),
                  email = COALESCE($2, email),
                  phone = COALESCE($3, phone),
                  gender = COALESCE($4, gender),
                  date_of_birth = COALESCE($5, date_of_birth),
                  address = COALESCE($6, address)
                WHERE id = $7`,
                [
                    account.fullName,
                    account.email,
                    account.phone,
                    account.gender,
                    account.dateOfBirth,
                    account.address,
                    doctorId,
                ]
            );
        }

        if (professional) {
            await client.query(
                `UPDATE doctors SET
                  experience_years = COALESCE($1, experience_years),
                  description = COALESCE($2, description)
                WHERE id = $3`,
                [
                    professional.yearsExperience,
                    professional.profileSummary,
                    doctorId,
                ]
            );
        }

        if (security?.newPassword) {
            if (!security.currentPassword) {
                throw { status: 400, message: "Current password is required." };
            }
            const { rows } = await client.query("SELECT password FROM users WHERE id = $1", [doctorId]);
            const isMatch = await bcrypt.compare(security.currentPassword, rows[0].password);
            if (!isMatch) {
                throw { status: 403, message: "Incorrect current password." };
            }
            const hashedPassword = await bcrypt.hash(security.newPassword, SALT_ROUNDS);
            await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, doctorId]);
        }

        await client.query("COMMIT");
        return { message: "Doctor settings updated successfully." };
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export {
    getAllDoctors,
    getDoctorById,
    generateAvailableSlots,
    getDoctorFromSingleHospital,
    searchDoctors,
    registerDoctorRequest,
    verifyDoctorRequest,
    getDoctorSettings,
    updateDoctorSettings
};
