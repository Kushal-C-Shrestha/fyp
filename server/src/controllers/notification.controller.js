import * as notificationService from "../services/notification.service.js";


export const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const notifications = await notificationService.getNotifications(userId);
        res.status(200).json({ notifications });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const updatedRows = await notificationService.markAsRead(req.params.id, userId);
        if (!updatedRows) {
            return res.status(404).json({ error: "Notification not found." });
        }
        res.status(200).json({ message: "Notification marked as read" });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user?.id ?? req.user?.user_id;
        const updatedRows = await notificationService.markAllAsRead(userId);
        res.status(200).json({ message: "All notifications marked as read", updatedCount: updatedRows || 0 });
    } catch (error) {
        res.status(error.status || 500).json({ error: error.message });
    }
};
