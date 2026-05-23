/**
 * Centralized Helper Utilities for e-Swasthya Server
 */

export const ADMIN_ROLES = new Set(["admin", "super_admin", "main_super_admin", "main super admin"]);
export const HOSPITAL_ROLES = new Set(["hospital", "hospital_admin"]);

export const normalizeRole = (role) => String(role || "").trim().toLowerCase();
export const normalizeStatus = (status) => String(status || "pending").trim().toLowerCase();

export const isAdminRole = (role) => ADMIN_ROLES.has(normalizeRole(role));
export const isHospitalRole = (role) => HOSPITAL_ROLES.has(normalizeRole(role));

export const titleCase = (value) =>
    String(value || "")
        .trim()
        .split(/[\s_-]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");

export const parsePositiveInt = (value, message = "Invalid numeric value.") => {
    const normalized = Number.parseInt(value, 10);
    if (!Number.isInteger(normalized) || normalized <= 0) {
        const error = new Error(message);
        error.status = 400;
        throw error;
    }
    return normalized;
};

export const parseOptionalNonNegativeInt = (value, message = "Consultation fee must be a valid positive number.") => {
    if (value === null || value === undefined || value === "") return null;

    const normalized = Number.parseInt(value, 10);
    if (!Number.isInteger(normalized) || normalized < 0) {
        const error = new Error(message);
        error.status = 400;
        throw error;
    }

    return normalized;
};

export const clamp = (value, maxLength) => String(value || "").trim().slice(0, maxLength);

export const slugify = (value) =>
    String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);

export const coerceBoolean = (value) => {
    if (typeof value === "boolean") return value;
    const normalized = String(value || "").trim().toLowerCase();
    return ["true", "1", "yes", "on"].includes(normalized);
};

export const parseJsonObject = (value, fallback = {}) => {
    if (value && typeof value === "object" && !Array.isArray(value)) return value;
    if (typeof value !== "string") return fallback;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
};

export const parseJsonArray = (value) => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string") {
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
    return [];
};
