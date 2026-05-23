import React from "react";

const toneClassNames = {
  neutral: "border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
  primary: "border-sky-200 text-sky-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700",
  success: "border-emerald-200 text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700",
  danger: "border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700",
};

const ActionIconButton = ({
  icon: Icon,
  label,
  tone = "neutral",
  className = "",
  ...props
}) => (
  <button
    type="button"
    aria-label={label}
    title={label}
    className={[
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-white transition disabled:cursor-not-allowed disabled:opacity-50",
      toneClassNames[tone] || toneClassNames.neutral,
      className,
    ].filter(Boolean).join(" ")}
    {...props}
  >
    {Icon ? <Icon className="h-4 w-4" /> : null}
  </button>
);

export default ActionIconButton;
