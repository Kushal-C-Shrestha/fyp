import React from "react";
import { Search } from "lucide-react";

/**
 * SearchFilterBar
 *
 * A styled search text input shared across list pages.
 *
 * Props
 * ─────
 * value         string           Controlled value
 * onChange      (val: string) => void
 * placeholder   string
 * icon          ReactNode        Icon to show on the left (defaults to Search icon)
 * className     string           Extra class on the outer wrapper
 * inputClassName string          Extra class on the <input>
 * maxWidth      string           Tailwind max-w-* class, default "sm:max-w-sm"
 */
const SearchFilterBar = ({
  value = "",
  onChange,
  placeholder = "Search...",
  icon,
  className = "",
  inputClassName = "",
  maxWidth = "sm:max-w-sm",
}) => {
  const Icon = icon !== undefined ? icon : <Search className="h-4 w-4 text-slate-400" />;

  return (
    <div className={`relative w-full ${maxWidth} ${className}`}>
      {Icon && (
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
          {Icon}
        </span>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`h-10 w-full rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100 ${Icon ? "pl-9 pr-3" : "px-3"} ${inputClassName}`}
      />
    </div>
  );
};

export default SearchFilterBar;
