import React from "react";

/**
 * EmptyState
 *
 * A consistent "no data" placeholder for list and table pages.
 *
 * Props
 * ─────
 * icon      ReactNode   Optional icon above the message
 * message   string      Main text
 * className string      Extra class on the wrapper
 */
const EmptyState = ({
  icon = null,
  message = "No data found.",
  className = "",
}) => (
  <div
    className={`flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-100 bg-slate-50/50 p-8 text-center ${className}`}
  >
    {icon && (
      <span className="text-slate-200">{icon}</span>
    )}
    <p className="text-sm font-medium text-slate-500">{message}</p>
  </div>
);

export default EmptyState;
