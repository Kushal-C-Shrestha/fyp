import api from "../api/axios";
import { formatShortDate as formatSharedShortDate } from "./dateTime";

export const getDoctorLeaveStorageKey = (doctorId) => `doctor-leave-requests-${doctorId}`;

export const getMyHospitalContext = async () => {
  const { data } = await api.get("/hospitals/me");
  return data?.hospital || null;
};

export const formatShortDate = (value) => formatSharedShortDate(value);

export const formatShortDateTime = (value) => {
  const parsed = new Date(value || "");
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const normalizeWorkflowStatus = (value) => String(value || "pending").trim().toLowerCase();

export const getStatusToneClasses = (status) => {
  const normalized = normalizeWorkflowStatus(status);
  if (normalized === "not required" || normalized === "not_required") {
    return "bg-slate-100 text-slate-700";
  }
  if (normalized === "approved" || normalized === "completed") {
    return "bg-emerald-50 text-emerald-700";
  }
  if (normalized === "rejected" || normalized === "cancelled") {
    return "bg-rose-50 text-rose-700";
  }
  return "bg-amber-50 text-amber-700";
};
