import React, { useMemo } from "react";
import { Bell, ChevronRight } from "lucide-react";
import { useNotifications } from "../../hooks/useNotifications";

const toTimestamp = (value) => {
  const parsed = new Date(value || "").getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const NotificationSection = ({ title, count, items, loading, onMarkAsRead }) => {
  if (!loading && items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <span className="text-xs font-medium text-slate-500">{count}</span>
      </div>

      <div className="divide-y divide-slate-100">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`skeleton-${index + 1}`}
              className="animate-pulse px-2 py-4 sm:px-3"
            >
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-full rounded bg-slate-100" />
              <div className="mt-2 h-3 w-2/3 rounded bg-slate-100" />
            </div>
          ))
          : items.map((item) => (
            <article
              key={item.id}
              className={`px-2 py-4 sm:px-3 ${item.is_read ? "" : "bg-sky-50/40"}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!item.is_read ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-sky-600" />
                    ) : null}
                    <p className={`text-sm text-slate-900 ${item.is_read ? "font-medium" : "font-semibold"}`}>
                      {item.title || "Notification"}
                    </p>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.detail || "Open the notification to view more details."}
                  </p>
                  <p className="mt-2 text-xs font-medium text-slate-500">{item.time || ""}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!item.is_read ? (
                    <button
                      type="button"
                      onClick={() => onMarkAsRead?.(item.id)}
                      className="inline-flex items-center rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                    >
                      Mark as read
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-500">
                      Read
                    </span>
                  )}

                  {item.action_url ? (
                    <a
                      href={item.action_url}
                      onClick={() => {
                        if (!item.is_read) {
                          onMarkAsRead?.(item.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      View
                      <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
      </div>
    </section>
  );
};

const Notifications = () => {
  const { notifications, loading, error, markNotificationAsRead } = useNotifications();

  const sortedNotifications = useMemo(
    () =>
      [...(Array.isArray(notifications) ? notifications : [])].sort(
        (a, b) => toTimestamp(b?.created_at) - toTimestamp(a?.created_at)
      ),
    [notifications]
  );

  const unreadNotifications = sortedNotifications.filter((item) => !item?.is_read);
  const readNotifications = sortedNotifications.filter((item) => item?.is_read);
  const unreadCount = unreadNotifications.length;

  return (
    <>
      <div className="space-y-6">
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {!loading && sortedNotifications.length === 0 ? (
          <section className="px-2 py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center text-slate-500">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">No notifications yet</h2>
            <p className="mt-2 text-sm text-slate-500">
              Appointment reminders, account alerts, and other updates will appear here.
            </p>
          </section>
        ) : (
          <div className="space-y-6">
            <NotificationSection
              title="Unread"
              count={unreadCount}
              items={unreadNotifications}
              loading={loading}
              onMarkAsRead={markNotificationAsRead}
            />
            <NotificationSection
              title="Earlier"
              count={readNotifications.length}
              items={readNotifications}
              loading={false}
              onMarkAsRead={markNotificationAsRead}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Notifications;
