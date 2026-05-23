import React from "react";
import NotificationsPanel from "../../components/NotificationsPanel";
import { useNotifications } from "../../hooks/useNotifications";

const AdminNotifications = () => {
  const { notifications, loading, error, markNotificationAsRead, markAllAsRead } = useNotifications();

  return (
    <>
      <NotificationsPanel
        notifications={notifications}
        loading={loading}
        error={error}
        onMarkAsRead={markNotificationAsRead}
        onMarkAllAsRead={markAllAsRead}
      />
    </>
  );
};

export default AdminNotifications;
