import React, { useEffect, useMemo, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";
import ActionIconButton from "../../components/ui/ActionIconButton";
import DataTable from "../../components/ui/DataTable";
import Modal from "../../components/ui/Modal";
import TabBar from "../../components/ui/TabBar";

const DAY_ORDER = {
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
  Sunday: 7,
};
const WEEK_DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toTimeInputValue = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return "";

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return "";
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return "";

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const formatTimeDisplay = (value) => {
  const normalized = toTimeInputValue(value);
  if (!normalized) return String(value || "");

  const [hourText, minuteText] = normalized.split(":");
  const hour = Number.parseInt(hourText, 10);
  if (!Number.isFinite(hour)) return normalized;

  const suffix = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minuteText} ${suffix}`;
};

const toDateOnlyKey = (value) => {
  if (!value) return "";
  const raw = String(value).trim();
  if (!raw) return "";

  const leadingDateMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (leadingDateMatch) return `${leadingDateMatch[1]}-${leadingDateMatch[2]}-${leadingDateMatch[3]}`;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const formatDateText = (value) => {
  if (!value) return "";
  const dateOnly = toDateOnlyKey(value);
  if (!dateOnly) return String(value);

  const [yearText, monthText, dayText] = dateOnly.split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);
  const day = Number.parseInt(dayText, 10);
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return String(value);

  return parsed.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const getTodayDateInputValue = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};

const formatDateTimeText = (value) => {
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

const normalizeWorkflowStatus = (value) => String(value || "pending").trim().toLowerCase();

const getWorkflowToneClasses = (status) => {
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

const formatRequestSource = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hospital admin" || normalized === "hospital_admin") return "Hospital Invite";
  if (normalized === "admin") return "Admin Invite";
  return "Doctor Request";
};

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return "Flexible";
  return `NPR ${amount.toLocaleString()}`;
};

const formatLeaveDateRange = (startDate, endDate) => {
  const startText = formatDateText(startDate);
  const endText = formatDateText(endDate);
  if (startText && endText) return `${startText} to ${endText}`;
  return startText || endText || "Date unavailable";
};

const toDraftRow = (row, index) => ({
  local_id: `row-${index}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  assignment_id: String(row?.assignment_id ?? ""),
  day_of_week: row?.day_of_week || "Monday",
  start_time: toTimeInputValue(row?.start_time || "09:00"),
  end_time: toTimeInputValue(row?.end_time || "13:00"),
  slot_interval_minutes:
    Number.isFinite(Number(row?.slot_interval_minutes)) && Number(row?.slot_interval_minutes) > 0
      ? Number(row.slot_interval_minutes)
      : 20,
  effective_from: row?.effective_from ? String(row.effective_from).slice(0, 10) : "",
  effective_to: row?.effective_to ? String(row.effective_to).slice(0, 10) : "",
  timezone: row?.timezone || "Asia/Kathmandu",
});

const buildEmptyDraftRow = (assignmentId) => ({
  local_id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  assignment_id: String(assignmentId || ""),
  day_of_week: "",
  start_time: "",
  end_time: "",
  slot_interval_minutes: "",
  effective_from: "",
  effective_to: "",
  timezone: "Asia/Kathmandu",
});

const buildEmptyAffiliationScheduleRow = () => ({
  local_id: `affiliation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  day_of_week: "",
  start_time: "",
  end_time: "",
  slot_interval_minutes: 20,
});

const createEmptyNewAssignmentForm = () => ({
  hospital_id: "",
  consultation_fee: "",
  requested_schedule: [buildEmptyAffiliationScheduleRow()],
});

const timeRangesOverlap = (startA, endA, startB, endB) => {
  const normalizedStartA = toTimeInputValue(startA);
  const normalizedEndA = toTimeInputValue(endA);
  const normalizedStartB = toTimeInputValue(startB);
  const normalizedEndB = toTimeInputValue(endB);

  if (!normalizedStartA || !normalizedEndA || !normalizedStartB || !normalizedEndB) {
    return false;
  }

  return normalizedStartA < normalizedEndB && normalizedStartB < normalizedEndA;
};

const normalizeRequestedScheduleRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => ({
      day_of_week: row?.day_of_week || "",
      start_time: toTimeInputValue(row?.start_time || ""),
      end_time: toTimeInputValue(row?.end_time || ""),
      slot_interval_minutes:
        Number.isFinite(Number(row?.slot_interval_minutes)) && Number(row.slot_interval_minutes) > 0
          ? Number(row.slot_interval_minutes)
          : 20,
    }))
    .filter((row) => row.day_of_week && row.start_time && row.end_time)
    .sort((a, b) => {
      const dayDiff = (DAY_ORDER[a.day_of_week] || 99) - (DAY_ORDER[b.day_of_week] || 99);
      if (dayDiff !== 0) return dayDiff;
      return String(a.start_time).localeCompare(String(b.start_time));
    });

const formatRequestedScheduleRows = (rows = []) =>
  normalizeRequestedScheduleRows(rows).map(
    (row) =>
      `${row.day_of_week}: ${formatTimeDisplay(row.start_time)} to ${formatTimeDisplay(row.end_time)}${
        row.slot_interval_minutes ? ` (${row.slot_interval_minutes}m)` : ""
      }`
  );

const pageMetaByView = {
  all: {
    title: "Schedules",
    description: "Edit your weekly schedules and manage leave requests.",
    loadingLabel: "Loading schedules...",
  },
  affiliations: {
    title: "Affiliations",
    description: "Manage hospital affiliation requests and respond to invitations from hospitals.",
    loadingLabel: "Loading affiliation requests...",
  },
  "schedule-changes": {
    title: "Schedule Changes",
    description: "Update your weekly hospital schedule.",
    loadingLabel: "Loading schedule changes...",
  },
  leave: {
    title: "Leave",
    description: "Create leave requests for your active hospital assignments and track recent entries.",
    loadingLabel: "Loading leave requests...",
  },
};

const DoctorSchedules = ({ view = "all" }) => {
  const { user, accessToken } = useAuth();
  const resolvedView = pageMetaByView[view] ? view : "all";
  const pageMeta = pageMetaByView[resolvedView];
  const showAffiliationSection = resolvedView === "affiliations";
  const showScheduleSection = resolvedView === "all" || resolvedView === "schedule-changes";
  const showLeaveSection = resolvedView === "all" || resolvedView === "leave";

  const [doctorId, setDoctorId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [recurringSchedule, setRecurringSchedule] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [scheduleDraft, setScheduleDraft] = useState([]);
  const [scheduleError, setScheduleError] = useState("");
  const [scheduleSuccess, setScheduleSuccess] = useState("");
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState(null);
  const [hospitalOptions, setHospitalOptions] = useState([]);
  const [addingAssignment, setAddingAssignment] = useState(false);
  const [showAddHospitalForm, setShowAddHospitalForm] = useState(false);
  const [assignmentRequests, setAssignmentRequests] = useState([]);
  const [currentAssignments, setCurrentAssignments] = useState([]);
  const [activeAffiliationTab, setActiveAffiliationTab] = useState("current");
  const [activeLeaveTab, setActiveLeaveTab] = useState("requested");
  const [showLeaveFormModal, setShowLeaveFormModal] = useState(false);
  const [removingAssignmentId, setRemovingAssignmentId] = useState(null);
  const [confirmRemoveAssignment, setConfirmRemoveAssignment] = useState(null);
  const [newAssignmentForm, setNewAssignmentForm] = useState(createEmptyNewAssignmentForm);

  const [leaveForm, setLeaveForm] = useState({
    assignment_id: "",
    leave_type: "full_day",
    start_date: "",
    end_date: "",
    start_time: "",
    end_time: "",
    reason: "",
  });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveError, setLeaveError] = useState("");
  const [leaveSuccess, setLeaveSuccess] = useState("");

  const [loading, setLoading] = useState(true);
  const [reviewingRequestId, setReviewingRequestId] = useState(null);
  const todayDateInputValue = useMemo(() => getTodayDateInputValue(), []);

  useEffect(() => {
    const loadSchedules = async () => {
      try {
        setLoading(true);
        setScheduleError("");
        setScheduleSuccess("");

        const doctorRes = await api.get("/doctors");
        const doctorList = Array.isArray(doctorRes?.data?.doctors) ? doctorRes.data.doctors : [];
        const selfDoctor = doctorList.find((item) => Number(item.user_id) === Number(user?.id));

        if (!selfDoctor?.user_id) {
          setDoctorId(null);
          setSlots([]);
          setRecurringSchedule([]);
          setAssignments([]);
          setScheduleDraft([]);
          setEditingAssignmentId(null);
          return;
        }

        setDoctorId(Number(selfDoctor.user_id));
        const availabilityRes = await api.get(`/doctors/${selfDoctor.user_id}/availability`);

        const loadedSlots = Array.isArray(availabilityRes?.data?.slots) ? availabilityRes.data.slots : [];
        const loadedSchedule = Array.isArray(availabilityRes?.data?.recurringSchedule)
          ? availabilityRes.data.recurringSchedule
          : [];
        const loadedAssignments = Array.isArray(availabilityRes?.data?.assignments) ? availabilityRes.data.assignments : [];
        let loadedHospitals = [];
        let loadedAssignmentRequests = [];
        let loadedLeaveRequests = [];
        try {
          const hospitalRes = await api.get("/hospitals");
          loadedHospitals = Array.isArray(hospitalRes?.data?.hospitals)
            ? hospitalRes.data.hospitals
                .map((hospital) => ({
                  hospital_id: hospital?.hospital_id,
                  hospital_name: hospital?.hospital_name || "Hospital",
                }))
                .filter((hospital) => Number.isInteger(Number(hospital.hospital_id)))
            : [];
        } catch {
          loadedHospitals = [];
        }
        try {
          const assignmentRequestsRes = await api.get(`/doctors/${selfDoctor.user_id}/assignment-requests`);
          loadedAssignmentRequests = Array.isArray(assignmentRequestsRes?.data?.requests)
            ? assignmentRequestsRes.data.requests
            : [];
        } catch {
          loadedAssignmentRequests = [];
        }
        let loadedCurrentAssignments = [];
        try {
          const assignmentsRes = await api.get(`/doctors/${selfDoctor.user_id}/assignments`);
          loadedCurrentAssignments = Array.isArray(assignmentsRes?.data?.assignments)
            ? assignmentsRes.data.assignments
            : [];
        } catch {
          loadedCurrentAssignments = [];
        }
        try {
          const leaveRequestsRes = await api.get(`/doctors/${selfDoctor.user_id}/leave-requests`);
          loadedLeaveRequests = Array.isArray(leaveRequestsRes?.data?.requests)
            ? leaveRequestsRes.data.requests
            : [];
        } catch {
          loadedLeaveRequests = [];
        }

        setSlots(loadedSlots);
        setRecurringSchedule(loadedSchedule);
        setAssignments(loadedAssignments);
        setScheduleDraft(loadedSchedule.map(toDraftRow));
        setEditingAssignmentId(null);
        setHospitalOptions(loadedHospitals);
        setAssignmentRequests(loadedAssignmentRequests);
        setCurrentAssignments(loadedCurrentAssignments);
        setLeaveRequests(loadedLeaveRequests);
        setShowAddHospitalForm(false);
      } catch {
        setDoctorId(null);
        setSlots([]);
        setRecurringSchedule([]);
        setAssignments([]);
        setScheduleDraft([]);
        setEditingAssignmentId(null);
        setHospitalOptions([]);
        setAssignmentRequests([]);
        setCurrentAssignments([]);
        setLeaveRequests([]);
        setShowAddHospitalForm(false);
      } finally {
        setLoading(false);
      }
    };

    loadSchedules();
  }, [user?.id]);

  const groupedRecurring = useMemo(() => {
    const assignmentMap = new Map();
    recurringSchedule.forEach((item) => {
      const assignmentId = Number(item?.assignment_id) || 0;
      const key =
        assignmentId > 0
          ? `assignment-${assignmentId}`
          : `${item?.hospital_name || "Hospital unavailable"}-${item?.department_name || "General"}`;

      if (!assignmentMap.has(key)) {
        assignmentMap.set(key, {
          key,
          assignment_id: assignmentId || null,
          hospital_name: item?.hospital_name || "Hospital unavailable",
          department_name: item?.department_name || "General",
          assignment_status: item?.assignment_status || "Active",
          rows: [],
        });
      }

      assignmentMap.get(key).rows.push(item);
    });

    return Array.from(assignmentMap.values()).map((group) => ({
      ...group,
      rows: [...group.rows].sort((a, b) => {
        const dayA = DAY_ORDER[a?.day_of_week] || 99;
        const dayB = DAY_ORDER[b?.day_of_week] || 99;
        if (dayA !== dayB) return dayA - dayB;
        return toTimeInputValue(a?.start_time).localeCompare(toTimeInputValue(b?.start_time));
      }),
    }));
  }, [recurringSchedule]);

  const assignmentOptions = useMemo(() => {
    if (Array.isArray(assignments) && assignments.length > 0) {
      return assignments
        .map((assignment) => ({
          assignment_id: assignment.assignment_id,
          hospital_id: assignment.hospital_id ?? null,
          hospital_name: assignment.hospital_name || "Hospital unavailable",
          department_name: assignment.department_name || "General",
          assignment_status: assignment.assignment_status || "Active",
        }))
        .filter(
          (assignment) =>
            Number.isInteger(Number(assignment.assignment_id)) && Number(assignment.assignment_id) > 0
        );
    }

    return groupedRecurring
      .map((assignment) => ({
        assignment_id: assignment.assignment_id,
        hospital_id: null,
        hospital_name: assignment.hospital_name,
        department_name: assignment.department_name,
        assignment_status: assignment.assignment_status || "Active",
      }))
      .filter(
        (assignment) =>
          Number.isInteger(Number(assignment.assignment_id)) && Number(assignment.assignment_id) > 0
      );
  }, [assignments, groupedRecurring]);

  const scheduleRowsByAssignment = useMemo(
    () =>
      assignmentOptions.map((assignment) => ({
        ...assignment,
        rows: scheduleDraft
          .filter((row) => String(row.assignment_id) === String(assignment.assignment_id))
          .sort((a, b) => {
            const dayA = DAY_ORDER[a.day_of_week] || 99;
            const dayB = DAY_ORDER[b.day_of_week] || 99;
            if (dayA !== dayB) return dayA - dayB;
            return String(a.start_time || "").localeCompare(String(b.start_time || ""));
          }),
      })),
    [assignmentOptions, scheduleDraft]
  );

  const currentRowsByAssignment = useMemo(() => {
    const rowsByAssignment = new Map();

    recurringSchedule.forEach((row) => {
      const assignmentIdText = String(row?.assignment_id ?? "");
      if (!assignmentIdText) return;
      if (!rowsByAssignment.has(assignmentIdText)) {
        rowsByAssignment.set(assignmentIdText, []);
      }
      rowsByAssignment.get(assignmentIdText).push(row);
    });

    rowsByAssignment.forEach((rows) => {
      rows.sort((a, b) => {
        const dayA = DAY_ORDER[a?.day_of_week] || 99;
        const dayB = DAY_ORDER[b?.day_of_week] || 99;
        if (dayA !== dayB) return dayA - dayB;
        return toTimeInputValue(a?.start_time).localeCompare(toTimeInputValue(b?.start_time));
      });
    });

    return rowsByAssignment;
  }, [recurringSchedule]);

  const availableHospitalOptions = useMemo(() => {
    if (hospitalOptions.length === 0) return [];

    const assignedHospitalIds = new Set(
      assignmentOptions
        .map((assignment) => Number(assignment?.hospital_id))
        .filter((hospitalId) => Number.isInteger(hospitalId))
    );
    const pendingRequestHospitalIds = new Set(
      assignmentRequests
        .filter(
          (request) =>
            String(request?.request_status || "").trim().toLowerCase() === "pending"
        )
        .map((request) => Number(request?.hospital_id))
        .filter((hospitalId) => Number.isInteger(hospitalId))
    );

    return hospitalOptions.filter((hospital) => {
      const hospitalId = Number(hospital.hospital_id);
      return !assignedHospitalIds.has(hospitalId) && !pendingRequestHospitalIds.has(hospitalId);
    });
  }, [hospitalOptions, assignmentOptions, assignmentRequests]);

  const assignmentRequestSummary = useMemo(() => {
    const pendingWithDoctor = assignmentRequests.filter(
      (request) => String(request?.pending_with || "").trim().toLowerCase() === "doctor"
    ).length;
    const pendingWithHospital = assignmentRequests.filter(
      (request) => String(request?.pending_with || "").trim().toLowerCase() === "hospital"
    ).length;

    return {
      total: assignmentRequests.length,
      pendingWithDoctor,
      pendingWithHospital,
    };
  }, [assignmentRequests]);

  useEffect(() => {
    if (assignmentOptions.length === 0) {
      setLeaveForm((prev) => ({ ...prev, assignment_id: "" }));
      return;
    }

    if (assignmentOptions.some((item) => String(item.assignment_id) === String(leaveForm.assignment_id))) return;

    setLeaveForm((prev) => ({
      ...prev,
      assignment_id: String(assignmentOptions[0].assignment_id),
    }));
  }, [assignmentOptions, leaveForm.assignment_id]);

  const updateLeaveField = (field, value) => {
    setLeaveForm((prev) => ({ ...prev, [field]: value }));
    setLeaveError("");
    setLeaveSuccess("");
  };

  const updateNewAssignmentField = (field, value) => {
    setNewAssignmentForm((prev) => ({ ...prev, [field]: value }));
    setScheduleError("");
    setScheduleSuccess("");
  };

  const updateAffiliationScheduleRowField = (localId, field, value) => {
    const currentRow = (Array.isArray(newAssignmentForm.requested_schedule) ? newAssignmentForm.requested_schedule : []).find(
      (row) => row.local_id === localId
    );
    if (!currentRow) return;

    if (field === "day_of_week" && value) {
      const duplicateExists = (Array.isArray(newAssignmentForm.requested_schedule) ? newAssignmentForm.requested_schedule : []).some(
        (row) => row.local_id !== localId && String(row.day_of_week) === String(value)
      );

      if (duplicateExists) {
        setScheduleError(`Day ${value} is already added to this affiliation request.`);
        setScheduleSuccess("");
        return;
      }
    }

    setNewAssignmentForm((prev) => ({
      ...prev,
      requested_schedule: (Array.isArray(prev.requested_schedule) ? prev.requested_schedule : []).map((row) =>
        row.local_id === localId ? { ...row, [field]: value } : row
      ),
    }));
    setScheduleError("");
    setScheduleSuccess("");
  };

  const addAffiliationScheduleRow = () => {
    const usedDays = new Set(
      (Array.isArray(newAssignmentForm.requested_schedule) ? newAssignmentForm.requested_schedule : [])
        .map((row) => row.day_of_week)
        .filter(Boolean)
    );

    if (usedDays.size >= WEEK_DAYS.length) {
      setScheduleError("All weekdays are already added to this affiliation request.");
      setScheduleSuccess("");
      return;
    }

    setNewAssignmentForm((prev) => ({
      ...prev,
      requested_schedule: [
        ...(Array.isArray(prev.requested_schedule) ? prev.requested_schedule : []),
        buildEmptyAffiliationScheduleRow(),
      ],
    }));
    setScheduleError("");
    setScheduleSuccess("");
  };

  const removeAffiliationScheduleRow = (localId) => {
    setNewAssignmentForm((prev) => {
      const nextRows = (Array.isArray(prev.requested_schedule) ? prev.requested_schedule : []).filter(
        (row) => row.local_id !== localId
      );

      return {
        ...prev,
        requested_schedule: nextRows.length > 0 ? nextRows : [buildEmptyAffiliationScheduleRow()],
      };
    });
    setScheduleError("");
    setScheduleSuccess("");
  };

  const updateScheduleRowField = (localId, field, value) => {
    const currentRow = scheduleDraft.find((row) => row.local_id === localId);
    if (!currentRow) return;

    if (field === "day_of_week" && value) {
      const duplicateExists = scheduleDraft.some(
        (row) =>
          row.local_id !== localId &&
          String(row.assignment_id) === String(currentRow.assignment_id) &&
          String(row.day_of_week) === String(value)
      );

      if (duplicateExists) {
        setScheduleError(`Day ${value} is already added for this assignment.`);
        setScheduleSuccess("");
        return;
      }
    }

    setScheduleDraft((prev) => prev.map((row) => (row.local_id === localId ? { ...row, [field]: value } : row)));
    setScheduleError("");
    setScheduleSuccess("");
  };

  const addScheduleRow = (assignmentId) => {
    const usedDays = new Set(
      scheduleDraft
        .filter((row) => String(row.assignment_id) === String(assignmentId))
        .map((row) => row.day_of_week)
        .filter(Boolean)
    );

    if (usedDays.size >= WEEK_DAYS.length) {
      setScheduleError("All weekdays are already added for this assignment.");
      setScheduleSuccess("");
      return;
    }

    setScheduleDraft((prev) => [
      ...prev,
      buildEmptyDraftRow(assignmentId),
    ]);
    setScheduleError("");
    setScheduleSuccess("");
  };

  const validateRequestedAffiliationSchedule = () => {
    const rows = Array.isArray(newAssignmentForm.requested_schedule) ? newAssignmentForm.requested_schedule : [];
    const nonEmptyRows = rows.filter((row) =>
      [row?.day_of_week, row?.start_time, row?.end_time, row?.slot_interval_minutes].some(
        (item) => String(item ?? "").trim() !== ""
      )
    );

    if (nonEmptyRows.length === 0) {
      return { error: "Add at least one requested schedule row." };
    }

    const seenDays = new Set();
    for (let index = 0; index < nonEmptyRows.length; index += 1) {
      const row = nonEmptyRows[index];
      const dayOfWeek = String(row?.day_of_week || "").trim();
      const startTime = toTimeInputValue(row?.start_time || "");
      const endTime = toTimeInputValue(row?.end_time || "");
      const slotIntervalMinutes = Number(row?.slot_interval_minutes);

      if (!dayOfWeek || !startTime || !endTime) {
        return { error: `Requested schedule row ${index + 1} is incomplete.` };
      }

      if (seenDays.has(dayOfWeek)) {
        return { error: `Day ${dayOfWeek} is already added to this affiliation request.` };
      }
      seenDays.add(dayOfWeek);

      if (endTime <= startTime) {
        return { error: `Requested schedule row ${index + 1} must end after it starts.` };
      }

      if (!Number.isFinite(slotIntervalMinutes) || slotIntervalMinutes < 5) {
        return { error: `Requested schedule row ${index + 1} must have a valid slot interval.` };
      }
    }

    const normalizedRows = normalizeRequestedScheduleRows(nonEmptyRows);

    const activeConflict = normalizedRows.find((row) =>
      recurringSchedule.some(
        (existingRow) =>
          String(existingRow?.day_of_week || "") === row.day_of_week &&
          timeRangesOverlap(row.start_time, row.end_time, existingRow?.start_time, existingRow?.end_time)
      )
    );

    if (activeConflict) {
      const conflictingRow = recurringSchedule.find(
        (existingRow) =>
          String(existingRow?.day_of_week || "") === activeConflict.day_of_week &&
          timeRangesOverlap(activeConflict.start_time, activeConflict.end_time, existingRow?.start_time, existingRow?.end_time)
      );

      if (conflictingRow) {
        return {
          error: `${activeConflict.day_of_week} ${formatTimeDisplay(activeConflict.start_time)} to ${formatTimeDisplay(
            activeConflict.end_time
          )} clashes with your ${conflictingRow?.hospital_name || "existing"} schedule (${formatTimeDisplay(
            conflictingRow?.start_time
          )} to ${formatTimeDisplay(conflictingRow?.end_time)}).`,
        };
      }
    }

    const pendingConflict = normalizedRows.find((row) =>
      assignmentRequests.some((request) => {
        const isPending = normalizeWorkflowStatus(request?.request_status) === "pending";
        if (!isPending || Number(request?.hospital_id) === Number(newAssignmentForm.hospital_id)) return false;

        return normalizeRequestedScheduleRows(request?.requested_schedule).some(
          (requestedRow) =>
            requestedRow.day_of_week === row.day_of_week &&
            timeRangesOverlap(row.start_time, row.end_time, requestedRow.start_time, requestedRow.end_time)
        );
      })
    );

    if (pendingConflict) {
      const conflictingRequest = assignmentRequests.find((request) => {
        const isPending = normalizeWorkflowStatus(request?.request_status) === "pending";
        if (!isPending || Number(request?.hospital_id) === Number(newAssignmentForm.hospital_id)) return false;

        return normalizeRequestedScheduleRows(request?.requested_schedule).some(
          (requestedRow) =>
            requestedRow.day_of_week === pendingConflict.day_of_week &&
            timeRangesOverlap(pendingConflict.start_time, pendingConflict.end_time, requestedRow.start_time, requestedRow.end_time)
        );
      });

      if (conflictingRequest) {
        const conflictingRow = normalizeRequestedScheduleRows(conflictingRequest?.requested_schedule).find(
          (requestedRow) =>
            requestedRow.day_of_week === pendingConflict.day_of_week &&
            timeRangesOverlap(pendingConflict.start_time, pendingConflict.end_time, requestedRow.start_time, requestedRow.end_time)
        );

        return {
          error: `${pendingConflict.day_of_week} ${formatTimeDisplay(pendingConflict.start_time)} to ${formatTimeDisplay(
            pendingConflict.end_time
          )} clashes with your pending ${conflictingRequest?.hospital_name || "hospital"} request (${formatTimeDisplay(
            conflictingRow?.start_time
          )} to ${formatTimeDisplay(conflictingRow?.end_time)}).`,
        };
      }
    }

    return { rows: normalizedRows };
  };

  const addHospitalAssignment = async () => {
    if (!doctorId) {
      setScheduleError("Doctor profile is not loaded.");
      return;
    }
    if (!newAssignmentForm.hospital_id) {
      setScheduleError("Select a hospital first.");
      return;
    }

    const consultationFeeValue = String(newAssignmentForm.consultation_fee || "").trim();
    const parsedFee = consultationFeeValue ? Number(consultationFeeValue) : null;
    if (consultationFeeValue && (!Number.isFinite(parsedFee) || parsedFee < 0)) {
      setScheduleError("Consultation fee must be a valid positive number.");
      return;
    }

    const scheduleValidation = validateRequestedAffiliationSchedule();
    if (scheduleValidation?.error) {
      setScheduleError(scheduleValidation.error);
      return;
    }

    setScheduleError("");
    setScheduleSuccess("");
    try {
      setAddingAssignment(true);
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const payload = {
        hospital_id: Number(newAssignmentForm.hospital_id),
      };
      if (Number.isFinite(parsedFee)) {
        payload.consultation_fee = parsedFee;
      }
      payload.requested_schedule = scheduleValidation.rows;

      const response = await api.post(
        `/doctors/${doctorId}/assignment-requests`,
        payload,
        headers ? { headers } : undefined
      );

      const updatedRequests = Array.isArray(response?.data?.requests) ? response.data.requests : [];
      if (updatedRequests.length > 0) {
        setAssignmentRequests(updatedRequests);
      } else {
        const requestRefresh = await api.get(
          `/doctors/${doctorId}/assignment-requests`,
          headers ? { headers } : undefined
        );
        const refreshedRequests = Array.isArray(requestRefresh?.data?.requests)
          ? requestRefresh.data.requests
          : [];
        setAssignmentRequests(refreshedRequests);
      }

      setNewAssignmentForm(createEmptyNewAssignmentForm());
      setShowAddHospitalForm(false);
      setScheduleSuccess(
        response?.data?.message || "Hospital assignment request submitted for admin approval."
      );
    } catch (error) {
      setScheduleError(
        error?.response?.data?.message || "Failed to submit hospital assignment request."
      );
    } finally {
      setAddingAssignment(false);
    }
  };

  const reviewIncomingAssignmentRequest = async (requestId, status) => {
    if (!doctorId) {
      setScheduleError("Doctor profile is not loaded.");
      return;
    }

    try {
      setReviewingRequestId(requestId);
      setScheduleError("");
      setScheduleSuccess("");

      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const requestConfig = headers ? { headers } : undefined;

      const response = await api.put(
        `/doctors/assignment-requests/${requestId}/review`,
        { status },
        requestConfig
      );

      const [requestRefresh, availabilityRefresh] = await Promise.all([
        api.get(`/doctors/${doctorId}/assignment-requests`, requestConfig),
        api.get(`/doctors/${doctorId}/availability`, requestConfig),
      ]);

      const refreshedRequests = Array.isArray(requestRefresh?.data?.requests) ? requestRefresh.data.requests : [];
      const refreshedSlots = Array.isArray(availabilityRefresh?.data?.slots) ? availabilityRefresh.data.slots : [];
      const refreshedRecurring = Array.isArray(availabilityRefresh?.data?.recurringSchedule)
        ? availabilityRefresh.data.recurringSchedule
        : [];
      const refreshedAssignments = Array.isArray(availabilityRefresh?.data?.assignments)
        ? availabilityRefresh.data.assignments
        : [];

      setAssignmentRequests(refreshedRequests);
      setSlots(refreshedSlots);
      setRecurringSchedule(refreshedRecurring);
      setAssignments(refreshedAssignments);
      setScheduleDraft(refreshedRecurring.map(toDraftRow));
      setScheduleSuccess(response?.data?.message || "Affiliation request updated.");
    } catch (error) {
      setScheduleError(error?.response?.data?.message || "Failed to update affiliation request.");
    } finally {
      setReviewingRequestId(null);
    }
  };

  const removeScheduleRow = (localId) => {
    setScheduleDraft((prev) => prev.filter((row) => row.local_id !== localId));
    setScheduleError("");
    setScheduleSuccess("");
  };

  const resetDraftForAssignment = (assignmentId) => {
    const assignmentIdText = String(assignmentId || "");
    const assignmentRows = recurringSchedule
      .filter((row) => String(row?.assignment_id) === assignmentIdText)
      .map((row, index) => toDraftRow(row, index));

    setScheduleDraft((prev) => [
      ...prev.filter((row) => String(row.assignment_id) !== assignmentIdText),
      ...assignmentRows,
    ]);
  };

  const startScheduleEdit = (assignmentId) => {
    if (!assignmentId) return;
    resetDraftForAssignment(assignmentId);
    setScheduleError("");
    setScheduleSuccess("");
    setEditingAssignmentId(String(assignmentId));
  };

  const cancelScheduleEdit = (assignmentId) => {
    if (!assignmentId) return;
    resetDraftForAssignment(assignmentId);
    setScheduleError("");
    setScheduleSuccess("");
    setEditingAssignmentId((current) => (String(current || "") === String(assignmentId) ? null : current));
  };

  const saveScheduleUpdates = async (assignmentId = null) => {
    if (!doctorId) {
      setScheduleError("Doctor profile is not loaded.");
      return;
    }
    if (!assignmentId) {
      setScheduleError("Choose an assignment before submitting schedule changes.");
      return;
    }

    setScheduleError("");
    setScheduleSuccess("");

    const assignmentRows = scheduleDraft.filter(
      (row) => String(row.assignment_id) === String(assignmentId)
    );
    if (assignmentRows.length === 0) {
      setScheduleError("Add at least one schedule row for this assignment.");
      return;
    }

    const duplicateGuard = new Set();
    for (const row of assignmentRows) {
      if (!row.assignment_id || !row.day_of_week || !row.start_time || !row.end_time) {
        setScheduleError("Each schedule row must include assignment, day, start time, and end time.");
        return;
      }
      if (row.end_time <= row.start_time) {
        setScheduleError("End time must be later than start time.");
        return;
      }
      if (row.effective_from && row.effective_from < todayDateInputValue) {
        setScheduleError("Schedule changes cannot start in the past.");
        return;
      }
      const key = `${row.assignment_id}:${row.day_of_week}`;
      if (duplicateGuard.has(key)) {
        setScheduleError(`Duplicate day found for assignment ${row.assignment_id}: ${row.day_of_week}`);
        return;
      }
      duplicateGuard.add(key);
    }

    const payload = {
      assignment_id: Number(assignmentId),
      recurringSchedule: assignmentRows.map((row) => ({
        assignment_id: Number(row.assignment_id),
        day_of_week: row.day_of_week,
        start_time: row.start_time,
        end_time: row.end_time,
        slot_interval_minutes: Number(row.slot_interval_minutes) || 20,
        effective_from: row.effective_from || null,
        timezone: row.timezone || "Asia/Kathmandu",
      })),
    };

    try {
      setSavingSchedule(true);
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const response = await api.post(
        `/doctors/${doctorId}/schedule-change-requests`,
        payload,
        headers ? { headers } : undefined
      );

      resetDraftForAssignment(assignmentId);
      setEditingAssignmentId((current) => (String(current || "") === String(assignmentId) ? null : current));
      setScheduleSuccess(response?.data?.message || "Schedule change request submitted.");
    } catch (error) {
      setScheduleError(error?.response?.data?.message || "Failed to submit schedule change request.");
    } finally {
      setSavingSchedule(false);
    }
  };

  const submitLeaveRequest = async (event) => {
    event.preventDefault();
    setLeaveError("");
    setLeaveSuccess("");

    if (!doctorId) {
      setLeaveError("Doctor profile is not loaded.");
      return;
    }

    if (assignmentOptions.length > 0 && !leaveForm.assignment_id) {
      setLeaveError("Select an assignment to continue.");
      return;
    }

    if (!leaveForm.start_date || !leaveForm.end_date) {
      setLeaveError("Select both start and end dates.");
      return;
    }

    if (leaveForm.end_date < leaveForm.start_date) {
      setLeaveError("End date cannot be earlier than start date.");
      return;
    }

    const selectedAssignment =
      assignmentOptions.find((item) => String(item.assignment_id) === String(leaveForm.assignment_id)) || null;
    if (!selectedAssignment) {
      setLeaveError("Select a valid assignment to continue.");
      return;
    }

    if (leaveForm.start_date < todayDateInputValue) {
      setLeaveError("Leave requests cannot start in the past.");
      return;
    }

    try {
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const response = await api.post(
        `/doctors/${doctorId}/leave-requests`,
        {
          assignment_id: selectedAssignment?.assignment_id || null,
          leave_type: "full_day",
          start_date: leaveForm.start_date,
          end_date: leaveForm.end_date,
          start_time: null,
          end_time: null,
          reason: String(leaveForm.reason || "").trim(),
        },
        headers ? { headers } : undefined
      );

      setLeaveRequests(Array.isArray(response?.data?.requests) ? response.data.requests : []);
      setLeaveForm((prev) => ({
        ...prev,
        start_date: "",
        end_date: "",
        start_time: "",
        end_time: "",
        reason: "",
        leave_type: "full_day",
      }));
      setLeaveSuccess(response?.data?.message || "Leave request submitted.");
      setShowLeaveFormModal(false);
    } catch (error) {
      setLeaveError(error?.response?.data?.message || "Failed to submit leave request.");
    }
  };

  const removeLeaveRequest = async (leaveId) => {
    try {
      setLeaveError("");
      const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
      const response = await api.delete(`/doctors/${doctorId}/leave-requests/${leaveId}`, headers ? { headers } : undefined);
      setLeaveRequests(Array.isArray(response?.data?.requests) ? response.data.requests : []);
      setLeaveSuccess(response?.data?.message || "Leave request removed.");
    } catch (error) {
      setLeaveError(error?.response?.data?.message || "Failed to remove leave request.");
    }
  };

  const removeAffiliation = async (assignmentId) => {
    if (!doctorId) return;
    try {
      setRemovingAssignmentId(assignmentId);
      setScheduleError("");
      setScheduleSuccess("");
      const response = await api.delete(`/doctors/${doctorId}/assignments/${assignmentId}`);
      setCurrentAssignments(Array.isArray(response?.data?.assignments) ? response.data.assignments : []);
      setScheduleSuccess(response?.data?.message || "Affiliation removed.");
    } catch (error) {
      setScheduleError(error?.response?.data?.message || "Failed to remove affiliation.");
    } finally {
      setRemovingAssignmentId(null);
    }
  };

  const renderAddHospitalRequestForm = () => (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hospital</span>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
            value={newAssignmentForm.hospital_id}
            onChange={(event) => updateNewAssignmentField("hospital_id", event.target.value)}
            disabled={addingAssignment || availableHospitalOptions.length === 0}
          >
            <option value="">Select hospital</option>
            {availableHospitalOptions.map((hospital) => (
              <option key={hospital.hospital_id} value={hospital.hospital_id}>
                {hospital.hospital_name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Consultation Fee</span>
          <input
            type="number"
            min="0"
            step="100"
            placeholder="Fee (optional)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
            value={newAssignmentForm.consultation_fee}
            onChange={(event) => updateNewAssignmentField("consultation_fee", event.target.value)}
            disabled={addingAssignment || availableHospitalOptions.length === 0}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">Requested Weekly Schedule</p>
            <p className="mt-1 text-xs text-slate-500">
              Add the days and time ranges you want for this hospital. Overlaps with your other affiliations are blocked.
            </p>
          </div>
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={addAffiliationScheduleRow}
            disabled={addingAssignment}
          >
            Add Day
          </button>
        </div>

        <div className="space-y-2">
          {(Array.isArray(newAssignmentForm.requested_schedule) ? newAssignmentForm.requested_schedule : []).map((row) => {
            const usedDaysForRow = new Set(
              (Array.isArray(newAssignmentForm.requested_schedule) ? newAssignmentForm.requested_schedule : [])
                .filter((item) => item.local_id !== row.local_id)
                .map((item) => item.day_of_week)
                .filter(Boolean)
            );

            return (
              <div
                key={row.local_id}
                className="grid items-center gap-2 md:grid-cols-[1.2fr_1fr_1fr_130px_auto]"
              >
                <select
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                  value={row.day_of_week}
                  onChange={(event) => updateAffiliationScheduleRowField(row.local_id, "day_of_week", event.target.value)}
                  disabled={addingAssignment}
                >
                  <option value="">Select day</option>
                  {WEEK_DAYS.map((day) => (
                    <option key={day} value={day} disabled={usedDaysForRow.has(day)}>
                      {day}
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                  value={row.start_time}
                  onChange={(event) => updateAffiliationScheduleRowField(row.local_id, "start_time", event.target.value)}
                  disabled={addingAssignment}
                />
                <input
                  type="time"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                  value={row.end_time}
                  onChange={(event) => updateAffiliationScheduleRowField(row.local_id, "end_time", event.target.value)}
                  disabled={addingAssignment}
                />
                <input
                  type="number"
                  min="5"
                  step="5"
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                  value={row.slot_interval_minutes}
                  onChange={(event) =>
                    updateAffiliationScheduleRowField(row.local_id, "slot_interval_minutes", event.target.value)
                  }
                  disabled={addingAssignment}
                />
                <button
                  type="button"
                  aria-label="Remove requested day"
                  title="Remove requested day"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => removeAffiliationScheduleRow(row.local_id)}
                  disabled={addingAssignment}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={addHospitalAssignment}
          disabled={
            addingAssignment ||
            availableHospitalOptions.length === 0 ||
            !doctorId ||
            !newAssignmentForm.hospital_id
          }
        >
          {addingAssignment ? "Sending..." : "Send Request"}
        </button>
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => {
            setShowAddHospitalForm(false);
            setNewAssignmentForm(createEmptyNewAssignmentForm());
            setScheduleError("");
          }}
          disabled={addingAssignment}
        >
          Cancel
        </button>
      </div>
    </div>
  );

  const renderLeaveRequestForm = () => (
    <form className="space-y-4" onSubmit={submitLeaveRequest}>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Assignment</span>
          <select
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
            value={leaveForm.assignment_id}
            onChange={(event) => updateLeaveField("assignment_id", event.target.value)}
            disabled={assignmentOptions.length === 0}
          >
            {assignmentOptions.length === 0 ? <option value="">No assignment found</option> : null}
            {assignmentOptions.map((assignment) => (
              <option key={assignment.assignment_id} value={assignment.assignment_id}>
                {assignment.hospital_name} | {assignment.department_name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Start Date</span>
          <input
            type="date"
            min={todayDateInputValue}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
            value={leaveForm.start_date}
            onChange={(event) => updateLeaveField("start_date", event.target.value)}
          />
        </label>

        <label className="space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">End Date</span>
          <input
            type="date"
            min={leaveForm.start_date || todayDateInputValue}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
            value={leaveForm.end_date}
            onChange={(event) => updateLeaveField("end_date", event.target.value)}
          />
        </label>
      </div>

      <label className="space-y-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reason (Optional)</span>
        <textarea
          className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
          placeholder="Write a short reason for this leave."
          value={leaveForm.reason}
          onChange={(event) => updateLeaveField("reason", event.target.value)}
        />
      </label>

      {leaveError ? <p className="text-xs font-semibold text-rose-600">{leaveError}</p> : null}
      {leaveSuccess ? <p className="text-xs font-semibold text-emerald-700">{leaveSuccess}</p> : null}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          onClick={() => setShowLeaveFormModal(false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800"
        >
          Add Leave Request
        </button>
      </div>
    </form>
  );

  return (
    <>
      {confirmRemoveAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <p className="text-base font-semibold text-slate-900">Remove affiliation?</p>
            <p className="mt-2 text-sm text-slate-600">
              This will remove your affiliation with <span className="font-semibold">{confirmRemoveAssignment.hospital_name}</span>.
              Your schedule and leave requests for this hospital will also be deleted. This cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={async () => {
                  const aff = confirmRemoveAssignment;
                  setConfirmRemoveAssignment(null);
                  await removeAffiliation(aff.assignment_id);
                }}
                disabled={removingAssignmentId !== null}
                className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
              >
                {removingAssignmentId !== null ? "Removing..." : "Yes, Remove"}
              </button>
              <button
                type="button"
                onClick={() => setConfirmRemoveAssignment(null)}
                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <Modal
        isOpen={showAddHospitalForm}
        onClose={() => {
          if (addingAssignment) return;
          setShowAddHospitalForm(false);
          setScheduleError("");
        }}
        title="Add Hospital Request"
        subtitle="Send an affiliation request with your proposed weekly schedule."
        size="xl"
      >
        {renderAddHospitalRequestForm()}
      </Modal>
      <Modal
        isOpen={showLeaveFormModal}
        onClose={() => {
          setShowLeaveFormModal(false);
          setLeaveError("");
        }}
        title="Add Leave Request"
        subtitle="Request full-day leave from one of your hospital assignments."
        size="lg"
      >
        {renderLeaveRequestForm()}
      </Modal>
      <div className="min-h-full bg-white">
        {loading ? (
          <p className="py-6 text-sm text-slate-500">{pageMeta.loadingLabel}</p>
        ) : (
          <div className="w-full space-y-0">
            {showAffiliationSection || showScheduleSection ? (
              <section className="pb-4">
              {(showAffiliationSection || showScheduleSection) && scheduleError ? (
                <p className="mt-3 text-xs font-semibold text-rose-600">{scheduleError}</p>
              ) : null}
              {(showAffiliationSection || showScheduleSection) && scheduleSuccess ? (
                <p className="mt-3 text-xs font-semibold text-emerald-700">{scheduleSuccess}</p>
              ) : null}

              {showAffiliationSection ? (
                <div className="mt-4">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <TabBar
                      tabs={[
                        { value: "current", label: `Current (${currentAssignments.length})` },
                        { value: "requests", label: `Requests (${assignmentRequests.length})` },
                      ]}
                      value={activeAffiliationTab}
                      onChange={setActiveAffiliationTab}
                    />

                    {activeAffiliationTab === "requests" ? (
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                          Total: {assignmentRequestSummary.total}
                        </span>
                        <span className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 ring-1 ring-inset ring-cyan-100">
                          Your Review: {assignmentRequestSummary.pendingWithDoctor}
                        </span>
                        <span className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-100">
                          Hospital Review: {assignmentRequestSummary.pendingWithHospital}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {activeAffiliationTab === "current" ? (
                    <DataTable
                      columns={[{ label: "Hospital" }, { label: "Joined" }, { label: "Actions" }]}
                      data={currentAssignments}
                      getRowKey={(aff) => aff.assignment_id}
                      emptyText="No active affiliations."
                      pagination
                      pageSize={10}
                      resetPageKey="current-affiliations"
                      renderRow={(aff) => (
                        <tr key={aff.assignment_id} className="align-middle hover:bg-slate-50/70">
                          <td className="px-5 py-4 font-semibold text-slate-900">{aff.hospital_name}</td>
                          <td className="px-5 py-4 text-slate-600">{formatDateText(aff.created_at)}</td>
                          <td className="px-5 py-4">
                            <ActionIconButton
                              icon={Trash2}
                              label="Remove affiliation"
                              tone="danger"
                              onClick={() => setConfirmRemoveAssignment(aff)}
                              disabled={removingAssignmentId === aff.assignment_id}
                            />
                          </td>
                        </tr>
                      )}
                    />
                  ) : (
                    <>
                      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                          Send new affiliation requests and track hospital invitations here.
                        </p>
                        {!showAddHospitalForm ? (
                          <button
                            type="button"
                            className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={() => {
                              setNewAssignmentForm(createEmptyNewAssignmentForm());
                              setShowAddHospitalForm(true);
                              setScheduleError("");
                              setScheduleSuccess("");
                            }}
                            disabled={!doctorId || availableHospitalOptions.length === 0}
                          >
                            Add Hospital
                          </button>
                        ) : null}
                      </div>

                      {!showAddHospitalForm && availableHospitalOptions.length === 0 ? (
                        <p className="mb-4 text-xs text-slate-500">
                          No new hospitals available for request right now.
                        </p>
                      ) : null}

                      <DataTable
                        columns={[
                          { label: "Hospital" },
                          { label: "Source" },
                          { label: "Fee" },
                          { label: "Progress" },
                          { label: "Notes" },
                          { label: "Updated" },
                          { label: "Actions" },
                        ]}
                        data={assignmentRequests}
                        getRowKey={(request) => request.request_id}
                        emptyText="No affiliation requests found."
                        pagination
                        pageSize={10}
                        resetPageKey="affiliation-requests"
                        renderRow={(request) => {
                          const waitingForDoctor = String(request?.pending_with || "").trim().toLowerCase() === "doctor";
                          const canReview =
                            normalizeWorkflowStatus(request?.request_status) === "pending" && waitingForDoctor;
                          const scheduleRows = formatRequestedScheduleRows(request.requested_schedule);

                          return (
                            <tr key={`assignment-request-${request.request_id}`} className="align-top hover:bg-slate-50/70">
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">{request.hospital_name || "Hospital"}</p>
                                <p className="mt-1 text-xs text-slate-500">{request.department_name || "General"}</p>
                              </td>
                              <td className="px-5 py-4">
                                <p className="font-semibold text-slate-900">{formatRequestSource(request.request_source)}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {waitingForDoctor ? "Waiting for your response" : "Waiting on hospital"}
                                </p>
                              </td>
                              <td className="px-5 py-4 text-slate-700">{formatCurrency(request.consultation_fee)}</td>
                              <td className="px-5 py-4">
                                <div className="flex flex-wrap gap-2">
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowToneClasses(request.request_status)}`}>
                                    {request.request_status || "Pending"}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowToneClasses(request.hospital_approval_status)}`}>
                                    Hospital: {request.hospital_approval_status || "Pending"}
                                  </span>
                                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowToneClasses(request.doctor_approval_status)}`}>
                                    Doctor: {request.doctor_approval_status || "Pending"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-slate-700">
                                <p>{request.request_message || request.admin_notes || request.doctor_notes || "No notes added yet."}</p>
                                {scheduleRows.length > 0 ? (
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                      Requested Schedule
                                    </p>
                                    {scheduleRows.map((line) => (
                                      <p key={`${request.request_id}-${line}`} className="text-xs text-slate-500">
                                        {line}
                                      </p>
                                    ))}
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-5 py-4 text-slate-600">
                                <p>{formatDateTimeText(request.updated_at || request.created_at)}</p>
                                {request.doctor_reviewed_at ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    Reviewed {formatDateTimeText(request.doctor_reviewed_at)}
                                  </p>
                                ) : null}
                              </td>
                              <td className="px-5 py-4">
                                {canReview ? (
                                  <div className="flex items-center gap-2">
                                    <ActionIconButton
                                      icon={Check}
                                      label="Approve request"
                                      tone="success"
                                      onClick={() => reviewIncomingAssignmentRequest(request.request_id, "approved")}
                                      disabled={reviewingRequestId === request.request_id}
                                    />
                                    <ActionIconButton
                                      icon={X}
                                      label="Reject request"
                                      tone="danger"
                                      onClick={() => reviewIncomingAssignmentRequest(request.request_id, "rejected")}
                                      disabled={reviewingRequestId === request.request_id}
                                    />
                                  </div>
                                ) : (
                                  <p className="text-xs font-semibold text-slate-500">
                                    {normalizeWorkflowStatus(request?.request_status) === "approved"
                                      ? "Affiliation active"
                                      : waitingForDoctor
                                        ? "Waiting for your response"
                                        : "No action needed"}
                                  </p>
                                )}
                              </td>
                            </tr>
                          );
                        }}
                      />
                    </>
                  )}
                </div>
              ) : null}

              {showScheduleSection ? (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div className="flex items-center justify-between gap-3 bg-slate-100 px-5 py-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Hospital Schedules</p>
                    <p className="text-xs font-semibold text-slate-500">{scheduleRowsByAssignment.length} affiliations</p>
                  </div>

                  {scheduleRowsByAssignment.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {scheduleRowsByAssignment.map((assignment) => {
                        const assignmentIdText = String(assignment.assignment_id);
                        const isEditingThisAssignment = assignmentIdText === String(editingAssignmentId || "");
                        const currentRows = currentRowsByAssignment.get(assignmentIdText) || [];

                        return (
                          <div key={`assignment-${assignment.assignment_id}`} className="px-5 py-4 transition hover:bg-slate-50/70">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{assignment.hospital_name}</p>
                                <p className="mt-1 text-xs text-slate-500">{assignment.department_name || "General"}</p>
                              </div>

                              <div className="min-w-0 flex-1 lg:max-w-3xl">
                                {currentRows.length > 0 ? (
                                  <div className="flex flex-wrap gap-2">
                                    {currentRows.map((row, index) => {
                                      const effectiveFrom = formatDateText(row?.effective_from);
                                      const effectiveTo = formatDateText(row?.effective_to);
                                      const effectiveLabel =
                                        effectiveFrom && effectiveTo
                                          ? `${effectiveFrom} to ${effectiveTo}`
                                          : effectiveFrom
                                          ? `From ${effectiveFrom}`
                                          : "";

                                      return (
                                        <span
                                          key={`${assignment.assignment_id}-${row?.day_of_week}-${row?.start_time}-${index}`}
                                          className="rounded-full bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
                                        >
                                          {row?.day_of_week || "Day"} {formatTimeDisplay(row?.start_time)}-
                                          {formatTimeDisplay(row?.end_time)}
                                          {row?.slot_interval_minutes ? ` (${row.slot_interval_minutes}m)` : ""}
                                          {effectiveLabel ? ` | ${effectiveLabel}` : ""}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">No schedule set for this assignment yet.</p>
                                )}
                              </div>

                              <div className="flex shrink-0 justify-end">
                                {isEditingThisAssignment ? (
                                  <div className="flex gap-2">
                                    <button
                                      type="button"
                                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                      onClick={() => cancelScheduleEdit(assignment.assignment_id)}
                                      disabled={savingSchedule}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                                      onClick={() => saveScheduleUpdates(assignment.assignment_id)}
                                      disabled={savingSchedule || !doctorId}
                                    >
                                      {savingSchedule ? "Saving..." : "Submit Request"}
                                    </button>
                                  </div>
                                ) : (
                                  <ActionIconButton
                                    icon={Pencil}
                                    label="Edit schedule"
                                    tone="primary"
                                    onClick={() => startScheduleEdit(assignment.assignment_id)}
                                    disabled={
                                      !doctorId ||
                                      savingSchedule ||
                                      (editingAssignmentId !== null && !isEditingThisAssignment)
                                    }
                                  />
                                )}
                              </div>
                            </div>

                            {isEditingThisAssignment ? (
                              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <p className="text-sm font-semibold text-slate-900">Requested schedule update</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Changes are sent as a request for hospital review.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                                    onClick={() => addScheduleRow(assignment.assignment_id)}
                                  >
                                    Add Row
                                  </button>
                                </div>
                                <div className="space-y-2">
                                  {assignment.rows.length > 0 ? (
                                    assignment.rows.map((row) => {
                                      const usedDaysForAssignment = new Set(
                                        assignment.rows
                                          .filter((item) => item.local_id !== row.local_id)
                                          .map((item) => item.day_of_week)
                                          .filter(Boolean)
                                      );

                                      return (
                                        <div
                                          key={row.local_id}
                                          className="grid items-center gap-2 rounded-xl bg-white p-3 ring-1 ring-inset ring-slate-200 md:grid-cols-[1.2fr_1fr_1fr_1fr_1fr_auto]"
                                        >
                                          <select
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-100"
                                            value={row.day_of_week}
                                            onChange={(event) =>
                                              updateScheduleRowField(row.local_id, "day_of_week", event.target.value)
                                            }
                                          >
                                            <option value="">Select day</option>
                                            {WEEK_DAYS.map((day) => (
                                              <option key={day} value={day} disabled={usedDaysForAssignment.has(day)}>
                                                {day}
                                              </option>
                                            ))}
                                          </select>
                                          <input
                                            type="time"
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-100"
                                            value={row.start_time}
                                            onChange={(event) => updateScheduleRowField(row.local_id, "start_time", event.target.value)}
                                          />
                                          <input
                                            type="time"
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-100"
                                            value={row.end_time}
                                            onChange={(event) => updateScheduleRowField(row.local_id, "end_time", event.target.value)}
                                          />
                                          <input
                                            type="number"
                                            min="5"
                                            step="5"
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-100"
                                            value={row.slot_interval_minutes}
                                            onChange={(event) =>
                                              updateScheduleRowField(row.local_id, "slot_interval_minutes", event.target.value)
                                            }
                                          />
                                          <input
                                            type="date"
                                            min={todayDateInputValue}
                                            className="rounded-lg border border-slate-200 px-2 py-2 text-xs outline-none focus:ring-2 focus:ring-sky-100"
                                            value={row.effective_from}
                                            onChange={(event) =>
                                              updateScheduleRowField(row.local_id, "effective_from", event.target.value)
                                            }
                                          />
                                          <button
                                            type="button"
                                            aria-label="Remove schedule row"
                                            title="Remove schedule row"
                                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 transition hover:bg-rose-50"
                                            onClick={() => removeScheduleRow(row.local_id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </button>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="text-xs text-slate-500">No editable rows yet. Add one.</p>
                                  )}
                                </div>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="px-5 py-8 text-center text-sm text-slate-600">
                      {currentAssignments.length === 0
                        ? "You have no active hospital affiliations yet. Send an affiliation request from the Affiliations page."
                        : "No schedules configured for your affiliations."}
                    </div>
                  )}
                </div>
              ) : null}
              </section>
            ) : null}

            {showLeaveSection ? (
              <section className={`${showAffiliationSection || showScheduleSection ? "border-t border-slate-100/70" : ""} pt-6`}>
                {leaveError ? <p className="text-xs font-semibold text-rose-600">{leaveError}</p> : null}
                {leaveSuccess ? <p className="text-xs font-semibold text-emerald-700">{leaveSuccess}</p> : null}

                <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <TabBar
                    tabs={[
                      {
                        value: "requested",
                        label: `Requested (${leaveRequests.filter((leave) => normalizeWorkflowStatus(leave.status) === "pending").length})`,
                      },
                      {
                        value: "history",
                        label: `History (${leaveRequests.filter((leave) => normalizeWorkflowStatus(leave.status) !== "pending").length})`,
                      },
                    ]}
                    value={activeLeaveTab}
                    onChange={setActiveLeaveTab}
                  />
                  <button
                    type="button"
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => {
                      setLeaveError("");
                      setLeaveSuccess("");
                      setShowLeaveFormModal(true);
                    }}
                    disabled={assignmentOptions.length === 0}
                  >
                    Add Leave Request
                  </button>
                </div>

                <DataTable
                  columns={[
                    { label: "Assignment" },
                    { label: "Date Range" },
                    { label: "Reason" },
                    { label: "Status" },
                    { label: "Action" },
                  ]}
                  data={leaveRequests.filter((leave) =>
                    activeLeaveTab === "requested"
                      ? normalizeWorkflowStatus(leave.status) === "pending"
                      : normalizeWorkflowStatus(leave.status) !== "pending"
                  )}
                  getRowKey={(leave) => leave.leave_id}
                  emptyText={activeLeaveTab === "requested" ? "No pending leave requests." : "No leave history found."}
                  pagination
                  pageSize={10}
                  resetPageKey={activeLeaveTab}
                  renderRow={(leave) => (
                    <tr key={leave.leave_id} className="align-top hover:bg-slate-50/70">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{leave.hospital_name || "Hospital"}</p>
                        <p className="mt-1 text-xs text-slate-500">{leave.department_name || "General"}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{formatLeaveDateRange(leave.start_date, leave.end_date)}</td>
                      <td className="px-5 py-4 text-slate-700">{leave.reason || "-"}</td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getWorkflowToneClasses(leave.status)}`}>
                          {leave.status || "Pending"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {normalizeWorkflowStatus(leave.status) === "pending" ? (
                          <ActionIconButton
                            icon={Trash2}
                            label="Remove leave request"
                            tone="danger"
                            onClick={() => removeLeaveRequest(leave.leave_id)}
                          />
                        ) : (
                          <span className="text-xs font-semibold text-slate-500">No action needed</span>
                        )}
                      </td>
                    </tr>
                  )}
                />
              </section>
            ) : null}



          </div>
        )}
      </div>
    </>
  );
};

export default DoctorSchedules;
