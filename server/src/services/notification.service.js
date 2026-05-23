import pool from "../config/db.js";
import { io } from "../../app.js";

const normalizeText = (value = "") => String(value || "").trim();

const normalizeUserId = (userId) => {
    const normalized = Number.parseInt(userId, 10);
    if (!Number.isInteger(normalized)) {
        const error = new Error("Invalid user id.");
        error.status = 400;
        throw error;
    }
    return normalized;
};

const resolveNotificationType = ({ type = "", templateKey = "" } = {}) => {
    const normalizedType = normalizeText(type).toLowerCase();
    if (normalizedType) return normalizedType;

    const normalizedTemplateKey = normalizeText(templateKey).toLowerCase();
    if (normalizedTemplateKey.includes("appointment")) return "appointment_reminder";
    if (normalizedTemplateKey.includes("blog")) return "blog_update";
    return "general";
};

const mapNotificationRow = (row = {}) => ({
    id: row.id,
    user_id: row.user_id,
    template_key: row.template_key || "",
    title: row.title || "",
    detail: row.message || row.detail || "",
    action_text: row.action_text || "",
    action_url: row.action_url || "",
    metadata: row.metadata ?? null,
    is_read: Boolean(row.is_read),
    created_at: row.created_at || null,
    updated_at: row.updated_at || row.created_at || null,
});

const buildNotificationPayload = ({
    type = "",
    templateKey = "",
    title = "",
    detail = "",
    message = "",
} = {}) => {
    const safeTitle = normalizeText(title) || "You have a new notification";
    const safeDetail = normalizeText(detail || message) || "Please check your dashboard for details.";

    return {
        templateKey: normalizeText(templateKey),
        type: resolveNotificationType({ type, templateKey }),
        title: safeTitle,
        detail: safeDetail,
    };
};

export const getNotifications = async (userId) => {
    const normalizedUserId = normalizeUserId(userId);
    const { rows } = await pool.query(
        `
          SELECT id, user_id, type, title, message, is_read, created_at
          FROM notifications
          WHERE user_id = $1
          ORDER BY created_at DESC, id DESC
        `,
        [normalizedUserId]
    );

    return rows.map(mapNotificationRow);
};

export const markAsRead = async (notificationId, userId) => {
    const normalizedNotificationId = Number.parseInt(notificationId, 10);
    const normalizedUserId = normalizeUserId(userId);
    if (!Number.isInteger(normalizedNotificationId)) {
        const error = new Error("Invalid notification id.");
        error.status = 400;
        throw error;
    }

    const { rowCount } = await pool.query(
        `
          UPDATE notifications
          SET is_read = true
          WHERE id = $1
            AND user_id = $2
        `,
        [normalizedNotificationId, normalizedUserId]
    );

    return rowCount;
};

export const markAllAsRead = async (userId) => {
    const normalizedUserId = normalizeUserId(userId);
    const { rowCount } = await pool.query(
        `
          UPDATE notifications
          SET is_read = true
          WHERE user_id = $1
            AND is_read = false
        `,
        [normalizedUserId]
    );

    return rowCount;
};

export const createNotification = async ({
    userId,
    type = "",
    templateKey = "",
    title = "",
    detail = "",
    message = "",
    actionText = "",
    actionUrl = "",
    metadata = null,
} = {}) => {
    const normalizedUserId = normalizeUserId(userId);
    const payload = buildNotificationPayload({
        type,
        templateKey,
        title,
        detail,
        message,
    });

    const { rows } = await pool.query(
        `
          INSERT INTO notifications (user_id, type, title, message, is_read, created_at)
          VALUES ($1, $2, $3, $4, false, NOW())
          RETURNING id, user_id, type, title, message, is_read, created_at
        `,
        [normalizedUserId, payload.type, payload.title, payload.detail]
    );

    const result = {
        notification: {
            ...mapNotificationRow(rows[0] || {}),
            action_text: normalizeText(actionText),
            action_url: normalizeText(actionUrl),
            metadata,
        },
    };

    if (io) {
        io.to(`user_${normalizedUserId}`).emit("notification:new", result.notification);
    }

    return result;
};

export const dispatchNotifications = async (notifications = []) => {
    const entries = Array.isArray(notifications) ? notifications.filter(Boolean) : [];
    const results = await Promise.all(
        entries.map(async (entry) => {
            try {
                return await createNotification(entry);
            } catch (error) {
                return { notification: null, error };
            }
        })
    );

    return {
        notifications: results.map((item) => item.notification).filter(Boolean),
        errors: results
            .map((item) => item.error)
            .filter(Boolean)
            .map((error) => ({
                message: error?.message || "Unknown notification error",
            })),
    };
};
