import React from "react";
import api from "../api/axios";
import socket from "../lib/socket";
import { getSafeErrorMessage } from "../utils/errorMessages";

const formatNotificationTime = (value) => {
  const timestamp = new Date(value || "").getTime();
  if (!Number.isFinite(timestamp)) return "Unknown time";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min${diffMinutes === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;

  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const mapNotification = (item = {}) => ({
  id: item.id,
  template_key: item.template_key || "",
  title: item.title || "Notification",
  detail: item.detail || "",
  action_text: item.action_text || "",
  action_url: item.action_url || "",
  is_read: Boolean(item.is_read),
  created_at: item.created_at || null,
  updated_at: item.updated_at || null,
  metadata: item.metadata ?? null,
  time: formatNotificationTime(item.created_at),
});

export const useNotifications = (enabled = true) => {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!enabled) {
      setNotifications([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    let isActive = true;

    const loadNotifications = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/notifications");
        if (!isActive) return;
        setNotifications(
          Array.isArray(data?.notifications) ? data.notifications.map(mapNotification) : []
        );
      } catch (requestError) {
        if (!isActive) return;
        setNotifications([]);
        setError(getSafeErrorMessage(requestError, "Failed to load notifications."));
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    const handleNewNotification = (data) => {
      console.log("[useNotifications] New real-time notification received:", data);
      if (data && data.notification) {
        setNotifications((prev) => [mapNotification(data.notification), ...prev]);
      }
    };

    loadNotifications();
    socket.on("notification:new", handleNewNotification);

    return () => {
      isActive = false;
      socket.off("notification:new", handleNewNotification);
    };
  }, [enabled]);

  const markNotificationAsRead = async (notificationId) => {
    try {
      setError("");
      await api.patch(`/notifications/${notificationId}/read`);
      setNotifications((prev) =>
        prev.map((item) =>
          String(item.id) === String(notificationId)
            ? {
                ...item,
                is_read: true,
              }
            : item
        )
      );
    } catch (requestError) {
      setError(getSafeErrorMessage(requestError, "Failed to update the notification."));
    }
  };

  const markAllAsRead = async () => {
    try {
      setError("");
      await api.patch("/notifications/read-all");
      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          is_read: true,
        }))
      );
    } catch (requestError) {
      setError(getSafeErrorMessage(requestError, "Failed to update notifications."));
    }
  };

  return {
    notifications,
    loading,
    error,
    markNotificationAsRead,
    markAllAsRead,
  };
};

