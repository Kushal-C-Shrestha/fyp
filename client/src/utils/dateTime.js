export const formatShortDate = (value, fallback = "-") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
};

export const formatLongDate = (value, fallback = "-") => {
  if (!value) return fallback;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed.toLocaleDateString([], { year: "numeric", month: "long", day: "numeric" });
};

export const formatTime = (value, fallback = "") => {
  if (!value) return fallback;
  const [hours = "0", minutes = "00"] = String(value).split(":");
  const hour = parseInt(hours, 10);
  if (Number.isNaN(hour)) return fallback;
  return `${hour % 12 || 12}:${minutes || "00"} ${hour >= 12 ? "PM" : "AM"}`;
};

export const formatMessageTime = (value) => {
  const parsed = new Date(value);
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return safeDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};
