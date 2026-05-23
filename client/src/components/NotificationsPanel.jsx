import React from "react";
import { Search } from "lucide-react";
import Pagination from "./ui/Pagination";

const PAGE_SIZE = 20;

const toTimestamp = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const sortNotifications = (items = [], sortBy = "newest") => {
  const list = [...items];

  if (sortBy === "oldest") {
    return list.sort((a, b) => toTimestamp(a?.created_at) - toTimestamp(b?.created_at));
  }

  if (sortBy === "unread") {
    return list.sort((a, b) => {
      const unreadRankA = a?.is_read ? 1 : 0;
      const unreadRankB = b?.is_read ? 1 : 0;
      if (unreadRankA !== unreadRankB) return unreadRankA - unreadRankB;
      return toTimestamp(b?.created_at) - toTimestamp(a?.created_at);
    });
  }

  return list.sort((a, b) => toTimestamp(b?.created_at) - toTimestamp(a?.created_at));
};

const NotificationsPanel = ({
  notifications = [],
  loading = false,
  error = "",
  onMarkAllAsRead,
  onMarkAsRead,
}) => {
  const [sortBy, setSortBy] = React.useState("newest");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [currentPage, setCurrentPage] = React.useState(1);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [notifications]);

  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const unreadCount = safeNotifications.filter((item) => !item?.is_read).length;

  const filteredNotifications = safeNotifications.filter((item) => {
    if (statusFilter === "read" && !item?.is_read) return false;
    if (statusFilter === "unread" && item?.is_read) return false;

    const normalizedQuery = String(searchQuery || "").trim().toLowerCase();
    if (!normalizedQuery) return true;

    const searchableText = [
      item?.title,
      item?.detail,
      item?.time,
      item?.action_text,
    ]
      .map((value) => String(value || "").toLowerCase())
      .join(" ");

    return searchableText.includes(normalizedQuery);
  });

  const sortedNotifications = sortNotifications(filteredNotifications, sortBy);
  const totalItems = sortedNotifications.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  React.useEffect(() => {
    setCurrentPage((prev) => Math.min(Math.max(prev, 1), totalPages));
  }, [totalPages]);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const currentItems = sortedNotifications.slice(startIndex, startIndex + PAGE_SIZE);

  return (
    <div className="min-h-full bg-white">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative w-full sm:w-[320px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setCurrentPage(1);
            }}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100"
            placeholder="Search notifications"
            aria-label="Search notifications"
          />
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <select
              id="notification-sort"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="unread">Unread first</option>
            </select>
            <select
              id="notification-status-filter"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setCurrentPage(1);
              }}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              <option value="all">Filter: All</option>
              <option value="unread">Filter: Unread</option>
              <option value="read">Filter: Read</option>
            </select>
            <button
              type="button"
              onClick={() => onMarkAllAsRead?.()}
              disabled={unreadCount === 0 || loading}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-t-xl border border-slate-200">
        {loading ? (
          <p className="px-5 py-8 text-sm text-slate-500">Loading notifications...</p>
        ) : currentItems.length > 0 ? (
          currentItems.map((item) => (
            <article
              key={item.id}
              className={`border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50/70 ${
                item.is_read ? "bg-white" : "bg-sky-50/30"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${item.is_read ? "bg-slate-300" : "bg-sky-600"}`}
                      aria-hidden="true"
                    />
                    <p className={`truncate text-sm text-slate-900 ${item.is_read ? "font-medium" : "font-bold"}`}>
                      {item.title}
                    </p>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{item.detail}</p>
                  <p className="mt-2 text-xs font-medium text-slate-500">{item.time}</p>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {item.action_url ? (
                    <a
                      href={item.action_url}
                      className="inline-flex h-8 items-center rounded-lg border border-sky-100 bg-sky-50 px-3 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                    >
                      {item.action_text || "Open"}
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => onMarkAsRead?.(item.id)}
                    disabled={Boolean(item.is_read) || loading}
                    className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {item.is_read ? "Read" : "Mark as read"}
                  </button>
                </div>
              </div>
            </article>
          ))
        ) : (
          <p className="px-5 py-8 text-sm text-slate-500">No notifications found.</p>
        )}
      </div>

      <div className="rounded-b-xl border-x border-b border-slate-200 bg-white px-5 py-4">
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={PAGE_SIZE}
          itemLabel="notifications"
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default NotificationsPanel;
