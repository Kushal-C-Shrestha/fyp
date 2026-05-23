import pool from "../config/db.js";
import path from "path";
import fs from "fs";

export const getAppointmentRoomName = (appointmentId) => `appointment_${appointmentId}`;

export const checkAppointmentAccess = async ({ appointmentId, userId }) => {
    const apptId = parseInt(appointmentId, 10);
    const uId = parseInt(userId, 10);

    if (!apptId || !uId) {
        return { success: false, message: "Invalid appointment or user ID." };
    }

    const { rows } = await pool.query(
        "SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = $1 AND (patient_id = $2 OR doctor_id = $2)",
        [apptId, uId]
    );

    if (rows.length === 0) {
        return { success: false, message: "Unauthorized or appointment not found." };
    }

    return { success: true, appointment: rows[0] };
};

export const getOrCreateRoom = async ({ appointmentId, userId }) => {
    const apptId = parseInt(appointmentId, 10);
    const uId = parseInt(userId, 10);

    if (!apptId || !uId) throw { status: 400, message: "Invalid appointment or user ID." };

    const access = await checkAppointmentAccess({ appointmentId: apptId, userId: uId });
    if (!access.success) {
        throw { status: 403, message: "Unauthorized or appointment not found." };
    }

    const { rows } = await pool.query(
        "SELECT * FROM video_calls WHERE appointment_id = $1",
        [apptId]
    );

    if (rows.length > 0) {
        return {
            room_id: rows[0].id,
            call_status: rows[0].status,
            appointment_room: getAppointmentRoomName(apptId),
        };
    }

    const { rows: newRows } = await pool.query(
        "INSERT INTO video_calls (appointment_id, status) VALUES ($1, 'waiting') RETURNING *",
        [apptId]
    );

    return {
        room_id: newRows[0].id,
        call_status: newRows[0].status,
        appointment_room: getAppointmentRoomName(apptId),
    };
};

export const checkUser = async (roomId) => {
    if (!roomId) {
        return { success: false, message: "Room ID is required" };
    }
    try {
        const { rows } = await pool.query(
            `SELECT a.id as appointment_id, a.patient_id, a.doctor_id, a.status as appointment_status, 
            vc.status as call_status 
            FROM appointments a 
            LEFT JOIN video_calls vc ON a.id = vc.appointment_id 
            WHERE vc.id = $1`,
            [roomId]
        );

        if (rows.length === 0) {
            return { success: false, message: "Room not found" };
        }

        const appointment = rows[0];

        if (appointment.appointment_status === "completed") {
            return { success: false, message: "Appointment is already completed" };
        }

        return { success: true, appointment };
    } catch (error) {
        console.error("checkUser error:", error);
        return { success: false, message: "Internal server error" };
    }
};

export const startCall = async ({ roomId, appointmentId }) => {
    try {
        const apptId = parseInt(appointmentId, 10);

        if (apptId > 0) {
            const { rows } = await pool.query(
                `INSERT INTO video_calls (appointment_id, status, started_at, created_at, updated_at)
                 VALUES ($1, 'call-started', NOW(), NOW(), NOW())
                 ON CONFLICT (appointment_id) DO UPDATE
                   SET status = 'call-started',
                       started_at = COALESCE(video_calls.started_at, NOW()),
                       updated_at = NOW()
                 RETURNING *`,
                [apptId]
            );
            if (!rows.length) return { success: false, message: "Failed to start call." };
            return {
                success: true,
                room_id: rows[0].id,
                call_status: rows[0].status,
                videoCall: rows[0],
                appointment_room: getAppointmentRoomName(rows[0].appointment_id),
            };
        }
        return { success: false, message: "Invalid parameters for startCall." };
    } catch (error) {
        console.error("startCall error:", error);
        return { success: false, message: "Internal server error" };
    }
};

export const endCall = async ({ roomId, appointmentId }) => {
    try {
        let queryRows = [];

        if (roomId) {
            const { rows } = await pool.query(
                `UPDATE video_calls 
                 SET status = 'call-ended', ended_at = NOW(), updated_at = NOW()
                 WHERE id = $1 AND status <> 'call-ended'
                 RETURNING *`,
                [roomId]
            );
            queryRows = rows;
        } else if (appointmentId) {
            const apptId = parseInt(appointmentId, 10);
            if (!isNaN(apptId)) {
                const { rows } = await pool.query(
                    `UPDATE video_calls 
                     SET status = 'call-ended', ended_at = NOW(), updated_at = NOW()
                     WHERE appointment_id = $1 AND status <> 'call-ended'
                     RETURNING *`,
                    [apptId]
                );
                queryRows = rows;
            }
        }

        if (queryRows.length === 0) {
            return { success: false, message: "Call not found or already ended" };
        }

        return {
            success: true,
            room_id: queryRows[0].id,
            call_status: queryRows[0].status,
            appointment_room: getAppointmentRoomName(queryRows[0].appointment_id),
        };
    } catch (error) {
        console.error("endCall error:", error);
        return { success: false, message: "Internal server error" };
    }
};

export const getAppointmentChatMessages = async ({ appointmentId, userId }) => {
    const apptId = parseInt(appointmentId, 10);
    const uId = parseInt(userId, 10);
    const { rows: apptRows } = await pool.query(
        "SELECT * FROM appointments WHERE id = $1 AND (patient_id = $2 OR doctor_id = $2)",
        [apptId, uId]
    );
    if (apptRows.length === 0) {
        throw { status: 403, message: "Unauthorized or appointment not found" };
    }

    let chatId;
    let { rows: chatRows } = await pool.query(
        "SELECT id FROM appointment_chat WHERE appointment_id = $1",
        [appointmentId]
    );

    if (chatRows.length === 0) {
        const { rows: newChat } = await pool.query(
            "INSERT INTO appointment_chat (appointment_id, status) VALUES ($1, 'active') RETURNING id",
            [appointmentId]
        );
        chatId = newChat[0].id;
    } else {
        chatId = chatRows[0].id;
    }

    const { rows: messages } = await pool.query(
        `SELECT am.*, u.full_name AS sender_name
         FROM appointment_messages am
         LEFT JOIN users u ON u.id = am.sender_id
         WHERE am.appointment_chat_id = $1
         ORDER BY am.created_at ASC`,
        [chatId]
    );

    return { messages };
};

export const sendAppointmentChatMessage = async ({ appointmentId, userId, message, attachment }) => {
    const apptId = parseInt(appointmentId, 10);
    const uId = parseInt(userId, 10);
    const { rows: apptRows } = await pool.query(
        "SELECT * FROM appointments WHERE id = $1 AND (patient_id = $2 OR doctor_id = $2)",
        [apptId, uId]
    );
    if (apptRows.length === 0) throw { status: 403, message: "Unauthorized" };

    let chatId;
    const { rows: chatRows } = await pool.query(
        "SELECT id FROM appointment_chat WHERE appointment_id = $1",
        [apptId]
    );

    if (chatRows.length === 0) {
        const { rows: newChat } = await pool.query(
            "INSERT INTO appointment_chat (appointment_id, status) VALUES ($1, 'active') RETURNING id",
            [apptId]
        );
        chatId = newChat[0].id;
    } else {
        chatId = chatRows[0].id;
    }

    const attachmentUrl = attachment?.filename ?? null;
    const messageText = typeof message === "string" && message.trim() ? message.trim() : null;

    if (!messageText && !attachmentUrl) {
        throw { status: 400, message: "Message or attachment is required." };
    }

    const { rows: newMsg } = await pool.query(
        "INSERT INTO appointment_messages (appointment_chat_id, sender_id, message, attachment_url) VALUES ($1, $2, $3, $4) RETURNING *",
        [chatId, uId, messageText ?? "", attachmentUrl]
    );

    const { rows: senderRows } = await pool.query(
        "SELECT full_name FROM users WHERE id = $1",
        [uId]
    );
    const enrichedMessage = { ...newMsg[0], sender_name: senderRows[0]?.full_name || "" };

    return { message: enrichedMessage, appointment_room: getAppointmentRoomName(appointmentId), appointment_id: appointmentId };
};

export const getAppointmentChatAttachment = async ({ messageId, userId }) => {
    const { rows } = await pool.query(
        `SELECT am.attachment_url, a.id as appointment_id
         FROM appointment_messages am
         JOIN appointment_chat ac ON am.appointment_chat_id = ac.id
         JOIN appointments a ON ac.appointment_id = a.id
         WHERE am.id = $1 AND (a.patient_id = $2 OR a.doctor_id = $2)`,
        [messageId, userId]
    );

    if (rows.length === 0 || !rows[0].attachment_url) {
        throw { status: 404, message: "Attachment not found or unauthorized" };
    }

    const appointmentId = Number.parseInt(rows[0].appointment_id, 10);
    const folderName = Number.isInteger(appointmentId) ? String(appointmentId) : "general";

    const filePath = path.join(process.cwd(), "uploads", "appointment-chat", folderName, rows[0].attachment_url);

    if (!fs.existsSync(filePath)) {
        throw { status: 404, message: "File not found on server" };
    }

    return { file_path: filePath, file_name: rows[0].attachment_url };
};

export const getDoctorScheduledCalls = async ({ doctorId }) => {
    const { rows } = await pool.query(
        `SELECT
            a.id AS appointment_id,
            a.status AS appointment_status,
            a.reason_for_visit AS appointment_reason,
            a.notes AS appointment_notes,
            a.appointment_date::text AS appointment_date,
            a.appointment_time::text AS appointment_time,
            a.appointment_type,
            a.patient_id,
            a.doctor_id,
            p.full_name AS patient_name,
            p.profile_picture AS patient_image,
            h.full_name AS hospital_name,
            vc.id AS room_id,
            vc.status AS call_status
         FROM appointments a
         LEFT JOIN users p ON p.id = a.patient_id
         LEFT JOIN hospitals h ON h.id = a.hospital_id
         LEFT JOIN video_calls vc ON vc.appointment_id = a.id
         WHERE a.doctor_id = $1
           AND (
               a.appointment_type::text ILIKE '%online%'
               OR a.appointment_type::text ILIKE '%video%'
               OR a.appointment_type::text ILIKE '%virtual%'
               OR a.appointment_type::text ILIKE '%tele%'
           )
           AND a.status <> 'cancelled'
         ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
        [doctorId]
    );
    return rows;
};
