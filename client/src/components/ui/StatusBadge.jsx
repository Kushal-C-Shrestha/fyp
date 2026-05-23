import React from "react";

/**
 * StatusBadge
 *
 * Renders a small pill badge with semantic colour for common status values.
 *
 * Supported statuses (case-insensitive):
 *   pending   → amber
 *   approved  → emerald
 *   active    → emerald
 *   replied   → emerald
 *   completed → emerald
 *   rejected  → rose
 *   cancelled → rose
 *   inactive  → slate
 *   draft     → slate
 *   (other)   → slate
 *
 * Props
 * ─────
 * status   string     The status string from the API
 * size     "sm"|"md"  "sm" is the default compact pill; "md" is slightly larger
 */
const STATUS_CLASSES = {
  pending:   "bg-amber-50 text-amber-600 border border-amber-100",
  approved:  "bg-emerald-50 text-emerald-600 border border-emerald-100",
  active:    "bg-emerald-50 text-emerald-600 border border-emerald-100",
  replied:   "bg-emerald-50 text-emerald-700 border border-emerald-100",
  completed: "bg-emerald-50 text-emerald-600 border border-emerald-100",
  rejected:  "bg-rose-50 text-rose-600 border border-rose-100",
  cancelled: "bg-rose-50 text-rose-600 border border-rose-100",
  inactive:  "bg-slate-50 text-slate-500 border border-slate-200",
  draft:     "bg-slate-50 text-slate-500 border border-slate-200",
};

const StatusBadge = ({ status = "", size = "sm" }) => {
  const key = String(status).trim().toLowerCase();
  const colorClass = STATUS_CLASSES[key] ?? "bg-slate-50 text-slate-500 border border-slate-200";

  const sizeClass =
    size === "md"
      ? "px-2.5 py-1 text-xs"
      : "px-2 py-0.5 text-[10px]";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold uppercase tracking-widest ${sizeClass} ${colorClass}`}
    >
      {status || "—"}
    </span>
  );
};

export default StatusBadge;
