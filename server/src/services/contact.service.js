import { isValidEmail, isNonEmptyString, isValidPhone } from "../utils/validation.js";
import pool from "../config/db.js";
import { sendEmail } from "../utils/mailer.util.js";

const mapContactRow = (row = {}) => ({
    contact_id: row.id,
    id: row.id,
    user_id: row.user_id ?? null,
    name: row.name || "",
    email: row.email || "",
    phone: row.phone || "",
    content: row.content || "",
    reply: row.reply || "",
    status: row.status || "pending",
    replied_at: row.replied_at || null,
    created_at: row.created_at || null,
    updated_at: row.updated_at || null,
});

export const createContact = async ({ userId, name, email, phone, message }) => {
    if (!isNonEmptyString(name) || !isNonEmptyString(message)) {
        const error = new Error("Name and message are required.");
        error.status = 400;
        throw error;
    }

    if (email && !isValidEmail(email)) {
        const error = new Error("Invalid email address.");
        error.status = 400;
        throw error;
    }

    if (phone && !isValidPhone(phone)) {
        const error = new Error("Invalid phone number. Must be 10 digits.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
                INSERT INTO contact_messages (user_id, name, email, phone, content, status, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, 'pending', NOW(), NOW())
                RETURNING *
            `,
            [
                Number.isInteger(Number.parseInt(userId, 10)) ? Number.parseInt(userId, 10) : null,
                String(name || "").trim(),
                String(email || "").trim() || null,
                String(phone || "").trim() || null,
                String(message || "").trim(),
            ]
        );

        return mapContactRow(rows[0]);
    } catch (error) {
        if (!error.status) {
            console.error("Create Contact Error:", error);
            error.status = 500;
            error.message = "Server error";
        }
        throw error;
    }
};

export const getAllContacts = async () => {
    try {
        const { rows } = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC, id DESC");
        return rows.map(mapContactRow);
    } catch (error) {
        console.error("Get Contacts Error:", error);
        const err = new Error("Server error");
        err.status = 500;
        throw err;
    }
};

export const getOneContact = async (id) => {
    const normalizedId = Number.parseInt(id, 10);
    if (!Number.isInteger(normalizedId)) {
        const error = new Error("Invalid contact id.");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query("SELECT * FROM contact_messages WHERE id = $1 LIMIT 1", [normalizedId]);
        if (rows.length === 0) {
            const error = new Error("Message not found");
            error.status = 404;
            throw error;
        }

        return mapContactRow(rows[0]);
    } catch (error) {
        if (!error.status) {
            console.error("Get Contact By ID Error:", error);
            error.status = 500;
            error.message = "Server error";
        }
        throw error;
    }
};

export const replyContact = async (id, reply) => {
    const normalizedId = Number.parseInt(id, 10);
    if (!Number.isInteger(normalizedId)) {
        const error = new Error("Invalid contact id.");
        error.status = 400;
        throw error;
    }

    if (!reply || String(reply).trim() === "") {
        const error = new Error("Reply cannot be empty");
        error.status = 400;
        throw error;
    }

    try {
        const { rows } = await pool.query(
            `
                UPDATE contact_messages
                SET reply = $1,
                    status = 'replied',
                    replied_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
            `,
            [String(reply).trim(), normalizedId]
        );

        if (!rows || rows.length === 0) {
            const error = new Error("Message not found");
            error.status = 404;
            throw error;
        }

        const contact = mapContactRow(rows[0]);

        // Send email reply
        try {
            await sendEmail({
                to: contact.email,
                subject: "Response to your inquiry - e-Swasthya",
                template: "contactReply",
                context: {
                    name: contact.name,
                    originalMessage: contact.content,
                    reply: String(reply).trim()
                }
            });
        } catch (mailError) {
            console.error("Failed to send contact reply email:", mailError);
            // We don't throw here so the DB update still counts, but maybe we should log it
        }

        return {
            message: "Replied successfully",
            contact,
        };
    } catch (error) {
        if (!error.status) {
            console.error("Reply Contact Error:", error);
            error.status = 500;
            error.message = "Server error";
        }
        throw error;
    }
};
