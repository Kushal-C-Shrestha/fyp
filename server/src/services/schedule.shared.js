const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const normalizeDayOfWeek = (value) => {
    if (value === null || value === undefined) return "";

    const raw = String(value).trim().toLowerCase();
    if (!raw) return "";

    const aliasMap = {
        sun: "Sunday",
        sunday: "Sunday",
        mon: "Monday",
        monday: "Monday",
        tue: "Tuesday",
        tues: "Tuesday",
        tuesday: "Tuesday",
        wed: "Wednesday",
        wednesday: "Wednesday",
        thu: "Thursday",
        thur: "Thursday",
        thurs: "Thursday",
        thursday: "Thursday",
        fri: "Friday",
        friday: "Friday",
        sat: "Saturday",
        saturday: "Saturday",
    };

    return aliasMap[raw] || "";
};

export const normalizeDateOnly = (value) => {
    if (!value) return "";

    if (value instanceof Date) {
        return formatDateOnly(value);
    }

    const raw = String(value).trim();
    const leadingDate = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (leadingDate) {
        return `${leadingDate[1]}-${leadingDate[2]}-${leadingDate[3]}`;
    }

    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return "";
    return formatDateOnly(parsed);
};

export const normalizeTimeOnly = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const match = raw.match(/^(\d{1,2}):(\d{2})/);
    if (!match) return "";

    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
};

export const timeToMinutes = (value) => {
    const normalized = normalizeTimeOnly(value);
    if (!normalized) return null;
    const [hourText, minuteText] = normalized.split(":");
    const hour = Number.parseInt(hourText, 10);
    const minute = Number.parseInt(minuteText, 10);
    return hour * 60 + minute;
};

export const minutesToTime = (value) => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return "";
    const normalized = ((minutes % 1440) + 1440) % 1440;
    const hour = Math.floor(normalized / 60);
    const minute = normalized % 60;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
};

export const formatDateOnly = (value) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

export const parseDateOnly = (value) => {
    const normalized = normalizeDateOnly(value);
    if (!normalized) return null;
    const [yearText, monthText, dayText] = normalized.split("-");
    const year = Number.parseInt(yearText, 10);
    const month = Number.parseInt(monthText, 10);
    const day = Number.parseInt(dayText, 10);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
    return new Date(year, month - 1, day);
};

export const buildAppointmentSlotKey = ({ doctorId, hospitalId, date, time }) =>
    `${doctorId}:${hospitalId}:${normalizeDateOnly(date)}:${normalizeTimeOnly(time)}`;

export const encodeSyntheticSlotId = (payload = {}) =>
    Buffer.from(
        JSON.stringify({
            assignmentId: Number(payload.assignmentId),
            doctorId: Number(payload.doctorId),
            hospitalId: Number(payload.hospitalId),
            date: normalizeDateOnly(payload.date),
            time: normalizeTimeOnly(payload.time),
        }),
        "utf8"
    ).toString("base64url");

export const decodeSyntheticSlotId = (slotId = "") => {
    try {
        const parsed = JSON.parse(Buffer.from(String(slotId || ""), "base64url").toString("utf8"));
        const assignmentId = Number.parseInt(parsed?.assignmentId, 10);
        const doctorId = Number.parseInt(parsed?.doctorId, 10);
        const hospitalId = Number.parseInt(parsed?.hospitalId, 10);
        const date = normalizeDateOnly(parsed?.date);
        const time = normalizeTimeOnly(parsed?.time);

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) return null;
        if (!Number.isInteger(doctorId) || doctorId <= 0) return null;
        if (!Number.isInteger(hospitalId) || hospitalId <= 0) return null;
        if (!date || !time) return null;

        return { assignmentId, doctorId, hospitalId, date, time };
    } catch {
        return null;
    }
};

export const createDateRange = ({ startDate, endDate, days = 30 }) => {
    const start = parseDateOnly(startDate) || new Date();
    start.setHours(0, 0, 0, 0);

    const end = parseDateOnly(endDate) || new Date(start);
    end.setHours(0, 0, 0, 0);

    if (!startDate && !endDate) {
        end.setDate(start.getDate() + Math.max(0, Number.parseInt(days, 10) || 30));
    }

    if (end < start) {
        return {
            startDate: formatDateOnly(start),
            endDate: formatDateOnly(start),
        };
    }

    return {
        startDate: formatDateOnly(start),
        endDate: formatDateOnly(end),
    };
};

export const isSlotPast = (dateOnly, timeOnly, now = new Date()) => {
    const date = parseDateOnly(dateOnly);
    const normalizedTime = normalizeTimeOnly(timeOnly);
    if (!date || !normalizedTime) return true;

    const [hourText, minuteText] = normalizedTime.split(":");
    const slotDateTime = new Date(date);
    slotDateTime.setHours(Number.parseInt(hourText, 10), Number.parseInt(minuteText, 10), 0, 0);

    return slotDateTime <= now;
};

export const expandAvailabilitySlots = ({
    assignmentRows = [],
    bookedKeys = new Set(),
    startDate,
    endDate,
    includeBooked = true,
    now = new Date(),
}) => {
    const normalizedStart = parseDateOnly(startDate);
    const normalizedEnd = parseDateOnly(endDate);
    if (!normalizedStart || !normalizedEnd) return [];

    const rows = Array.isArray(assignmentRows) ? assignmentRows : [];
    const slots = [];

    for (const row of rows) {
        const assignmentId = Number.parseInt(row?.assignment_id, 10);
        const doctorId = Number.parseInt(row?.doctor_id, 10);
        const hospitalId = Number.parseInt(row?.hospital_id, 10);
        const dayName = normalizeDayOfWeek(row?.day_of_week);
        const startMinutes = timeToMinutes(row?.start_time);
        const endMinutes = timeToMinutes(row?.end_time);
        const interval = Math.max(5, Number.parseInt(row?.slot_interval_minutes, 10) || 20);
        const effectiveFrom = normalizeDateOnly(row?.effective_from);
        const effectiveTo = normalizeDateOnly(row?.effective_to);

        if (!Number.isInteger(assignmentId) || assignmentId <= 0) continue;
        if (!Number.isInteger(doctorId) || doctorId <= 0) continue;
        if (!Number.isInteger(hospitalId) || hospitalId <= 0) continue;
        if (!dayName) continue;
        if (!Number.isFinite(startMinutes) || !Number.isFinite(endMinutes) || endMinutes <= startMinutes) continue;

        const cursor = new Date(normalizedStart);
        while (cursor <= normalizedEnd) {
            const slotDate = formatDateOnly(cursor);
            const cursorDay = DAY_NAMES[cursor.getDay()];

            if (
                cursorDay === dayName &&
                (!effectiveFrom || slotDate >= effectiveFrom) &&
                (!effectiveTo || slotDate <= effectiveTo)
            ) {
                for (let minute = startMinutes; minute + interval <= endMinutes; minute += interval) {
                    const slotTime = minutesToTime(minute);
                    const slotEndTime = minutesToTime(minute + interval);
                    if (!slotTime || !slotEndTime) continue;
                    if (isSlotPast(slotDate, slotTime, now)) continue;

                    const bookedKey = buildAppointmentSlotKey({
                        doctorId,
                        hospitalId,
                        date: slotDate,
                        time: slotTime,
                    });
                    const isBooked = bookedKeys.has(bookedKey);
                    if (isBooked && !includeBooked) continue;

                    slots.push({
                        slot_id: encodeSyntheticSlotId({
                            assignmentId,
                            doctorId,
                            hospitalId,
                            date: slotDate,
                            time: slotTime,
                        }),
                        assignment_id: assignmentId,
                        doctor_id: doctorId,
                        hospital_id: hospitalId,
                        hospital_name: row?.hospital_name || "Hospital unavailable",
                        slot_date: slotDate,
                        slot_time: slotTime,
                        slot_start_time: slotTime,
                        slot_end_time: slotEndTime,
                        slot_status: isBooked ? "booked" : "available",
                    });
                }
            }

            cursor.setDate(cursor.getDate() + 1);
        }
    }

    return slots.sort((a, b) => {
        const dateCompare = String(a.slot_date).localeCompare(String(b.slot_date));
        if (dateCompare !== 0) return dateCompare;
        const timeCompare = String(a.slot_time).localeCompare(String(b.slot_time));
        if (timeCompare !== 0) return timeCompare;
        return Number(a.assignment_id || 0) - Number(b.assignment_id || 0);
    });
};

export const doesLeaveRequestBlockSlot = ({ slot = {}, leaveRequest = {} }) => {
    const slotAssignmentId = Number.parseInt(slot?.assignment_id ?? slot?.assignmentId, 10);
    const leaveAssignmentId = Number.parseInt(leaveRequest?.assignment_id ?? leaveRequest?.assignmentId, 10);

    if (Number.isInteger(slotAssignmentId) && Number.isInteger(leaveAssignmentId) && slotAssignmentId !== leaveAssignmentId) {
        return false;
    }

    const slotDate = normalizeDateOnly(slot?.slot_date ?? slot?.slotDate ?? slot?.date);
    const leaveStartDate = normalizeDateOnly(leaveRequest?.start_date ?? leaveRequest?.startDate);
    const leaveEndDate = normalizeDateOnly(leaveRequest?.end_date ?? leaveRequest?.endDate ?? leaveStartDate);

    if (!slotDate || !leaveStartDate || !leaveEndDate) return false;
    if (slotDate < leaveStartDate || slotDate > leaveEndDate) return false;

    const leaveType = String(leaveRequest?.leave_type ?? leaveRequest?.leaveType ?? "full_day")
        .trim()
        .toLowerCase();

    if (leaveType !== "custom_hours") {
        return true;
    }

    const leaveStartMinutes = timeToMinutes(leaveRequest?.start_time ?? leaveRequest?.startTime);
    const leaveEndMinutes = timeToMinutes(leaveRequest?.end_time ?? leaveRequest?.endTime);
    const slotStartMinutes = timeToMinutes(slot?.slot_start_time ?? slot?.slotStartTime ?? slot?.slot_time ?? slot?.slotTime);
    const slotEndMinutes = timeToMinutes(slot?.slot_end_time ?? slot?.slotEndTime);

    if (
        !Number.isFinite(leaveStartMinutes) ||
        !Number.isFinite(leaveEndMinutes) ||
        leaveEndMinutes <= leaveStartMinutes
    ) {
        return true;
    }

    if (!Number.isFinite(slotStartMinutes) || !Number.isFinite(slotEndMinutes) || slotEndMinutes <= slotStartMinutes) {
        return false;
    }

    return slotStartMinutes < leaveEndMinutes && slotEndMinutes > leaveStartMinutes;
};

export const filterSlotsByLeaveRequests = ({ slots = [], leaveRequests = [] }) => {
    const normalizedSlots = Array.isArray(slots) ? slots : [];
    const normalizedLeaveRequests = Array.isArray(leaveRequests) ? leaveRequests : [];
    if (!normalizedLeaveRequests.length) return normalizedSlots;

    return normalizedSlots.filter(
        (slot) => !normalizedLeaveRequests.some((leaveRequest) => doesLeaveRequestBlockSlot({ slot, leaveRequest }))
    );
};

export const parseJson = (value, fallback = null) => {
    if (value === null || value === undefined || value === "") return fallback;
    if (typeof value !== "string") return value;

    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
};

export const stringifyJson = (value, fallback = "{}") => {
    try {
        return JSON.stringify(value ?? {});
    } catch {
        return fallback;
    }
};

export const buildAppointmentRoomId = (appointmentId) => `appointment-${appointmentId}`;

export const getCallStatusFromChatStatus = (status) => {
    const normalized = String(status || "").trim().toLowerCase();
    if (!normalized) return "waiting";
    if (normalized === "active") return "ongoing";
    return "ended";
};
