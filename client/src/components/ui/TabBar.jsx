import React from "react";

/**
 * TabBar
 *
 * A pill-style tab switcher used across request/history views.
 *
 * Props
 * ─────
 * tabs      Array<{ value: string, label: string }>   Tab definitions
 * value     string                                     Active tab value
 * onChange  (value: string) => void
 * className string                                     Optional wrapper classes
 */
const TabBar = ({ tabs = [], value, onChange, className = "" }) => (
  <div className={`flex w-fit flex-wrap items-center gap-1 rounded-xl bg-slate-100 p-1 ${className}`}>
    {tabs.map((tab) => (
      <button
        key={tab.value}
        type="button"
        onClick={() => onChange(tab.value)}
        className={`rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wider transition sm:px-6 ${
          value === tab.value
            ? "bg-emerald-600 text-white shadow-sm"
            : "text-slate-500 hover:bg-white/70 hover:text-slate-800"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default TabBar;
