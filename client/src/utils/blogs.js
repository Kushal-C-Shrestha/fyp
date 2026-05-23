import { normalizeRole } from "./roleRouting.js";

export const BLOG_AUTHOR_ROLES = [
  "user",
  "doctor",
  "hospital",
  "admin",
];

export const formatBlogDate = (value, options = {}) => {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  });
};

export const getBlogStatusMeta = (status) => {
  const normalized = String(status || "").trim().toLowerCase();

  if (normalized === "approved") {
    return {
      label: "Approved",
      className: "border border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (normalized === "pending") {
    return {
      label: "Pending Review",
      className: "border border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (normalized === "rejected") {
    return {
      label: "Needs Changes",
      className: "border border-rose-200 bg-rose-50 text-rose-700",
    };
  }

  return {
    label: "Draft",
    className: "border border-slate-200 bg-slate-100 text-slate-700",
  };
};

export const parseTagInput = (value) => {
  const seen = new Set();

  return String(value || "")
    .split(",")
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
};

export const resolveBlogManagerPath = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "patient" || normalized === "user" ? "/profile/blogs" : "/blogs/manage";
};

export const isApprovedBlog = (status) => String(status || "").trim().toLowerCase() === "approved";
