import React from "react";

/**
 * PageAlert
 *
 * Inline error / success / warning / info banner for page-level feedback.
 *
 * Props
 * ─────
 * type      "error" | "success" | "warning" | "info"
 * message   string    The text to display
 * className string    Extra class on the wrapper
 *
 * Returns null when message is falsy so callers don't need to guard.
 */
const ALERT_CLASSES = {
  error:   "border-rose-200 bg-rose-50 text-rose-700",
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  info:    "border-sky-200 bg-sky-50 text-sky-700",
};

const PageAlert = ({ type = "error", message = "", className = "" }) => {
  if (!message) return null;

  const colorClass = ALERT_CLASSES[type] ?? ALERT_CLASSES.error;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${colorClass} ${className}`}
    >
      {message}
    </div>
  );
};

export default PageAlert;
