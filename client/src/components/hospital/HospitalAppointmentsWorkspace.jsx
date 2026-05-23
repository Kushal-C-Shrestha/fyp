import React, { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Search, Trash2, X } from "lucide-react";
import api from "../../api/axios";
import { formatShortDate } from "../../utils/hospitalDashboard";
import ActionIconButton from "../ui/ActionIconButton";
import DataTable from "../ui/DataTable";
import RescheduleModal from "../user/RescheduleModal.jsx";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "doctor_az", label: "Doctor A-Z" },
  { value: "patient_az", label: "Patient A-Z" },
];

const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "scheduled", label: "Scheduled" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "physical", label: "Physical" },
  { value: "online", label: "Online" },
];

const APPOINTMENT_COLUMNS = [
  { label: "Patient", className: "sm:px-6 lg:px-7" },
  { label: "Doctor" },
  { label: "Specialization" },
  { label: "Date" },
  { label: "Time" },
  { label: "Type" },
  { label: "Status" },
  { label: "Actions" },
];

const normalizeAppointmentStatus = (value) => {
  const raw = String(value || "").trim().toLowerCase();

  if (raw === "completed") return "completed";
  if (raw === "cancelled" || raw === "canceled") return "cancelled";
  if (raw === "pending") return "pending";
  if (raw === "confirmed" || raw === "scheduled") return "scheduled";

  return raw || "scheduled";
};

const formatStatusLabel = (value) => {
  const normalized = normalizeAppointmentStatus(value);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const getStatusClassName = (status) => {
  const normalized = normalizeAppointmentStatus(status);

  if (normalized === "completed") return "bg-emerald-50 text-emerald-700";
  if (normalized === "cancelled") return "bg-rose-50 text-rose-700";
  if (normalized === "pending") return "bg-amber-50 text-amber-700";

  return "bg-sky-50 text-sky-700";
};

const getAppointmentType = (appointment) => {
  const explicitMode = String(
    appointment?.appointment_type ||
      appointment?.appointment_mode ||
      appointment?.consultation_type ||
      appointment?.mode ||
      ""
  ).toLowerCase();

  if (/(online|virtual|video|tele)/.test(explicitMode)) return "online";
  if (/(physical|in[- ]?person|offline|clinic|hospital)/.test(explicitMode)) return "physical";

  const notes = String(appointment?.appointment_notes || appointment?.appointment_reason || "").toLowerCase();
  if (/consultation type:\s*online/.test(notes)) return "online";
  if (/consultation type:\s*(physical|in[- ]?person)/.test(notes)) return "physical";
  if (/\bonline\b/.test(notes)) return "online";

  return "physical";
};

const formatAppointmentType = (appointment) => {
  const type = getAppointmentType(appointment);
  return type.charAt(0).toUpperCase() + type.slice(1);
};

const formatAppointmentTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "-";

  const parsed = new Date(`1970-01-01T${raw}`);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 5) || raw;

  return parsed.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
};

const getAppointmentTimestamp = (appointment) => {
  const dateValue = String(appointment?.appointment_date || "").trim();
  const timeValue = String(appointment?.appointment_time || "00:00:00").trim() || "00:00:00";
  const parsed = new Date(`${dateValue}T${timeValue}`);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
};

const matchesSearch = (appointment, query) => {
  if (!query) return true;

  const haystack = [
    appointment?.patient_name,
    appointment?.patient_email,
    appointment?.doctor_name,
    appointment?.specialization_name,
    appointment?.appointment_reason,
    appointment?.appointment_notes,
    appointment?.appointment_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
};

const sortAppointments = (appointments, sortBy) => {
  const sorted = [...appointments];

  if (sortBy === "oldest") {
    sorted.sort((a, b) => getAppointmentTimestamp(a) - getAppointmentTimestamp(b));
    return sorted;
  }

  if (sortBy === "doctor_az") {
    sorted.sort((a, b) => String(a?.doctor_name || "").localeCompare(String(b?.doctor_name || "")));
    return sorted;
  }

  if (sortBy === "patient_az") {
    sorted.sort((a, b) => String(a?.patient_name || "").localeCompare(String(b?.patient_name || "")));
    return sorted;
  }

  sorted.sort((a, b) => getAppointmentTimestamp(b) - getAppointmentTimestamp(a));
  return sorted;
};

const EMPTY_FORM = { patientId: "", doctorId: "", type: "physical", reason: "" };

const formatSlotTime = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return raw;
  const parsed = new Date(`1970-01-01T${raw.length === 5 ? raw + ":00" : raw}`);
  if (Number.isNaN(parsed.getTime())) return raw.slice(0, 5);
  return parsed.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const HospitalAppointmentsWorkspace = ({ showSectionHeading = true }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [hospitalDoctors, setHospitalDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [modalError, setModalError] = useState("");

  const [hospitalId, setHospitalId] = useState(null);
  const [slotsData, setSlotsData] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/appointments");
        setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
      } catch (err) {
        setAppointments([]);
        setError(err?.response?.data?.message || "Failed to load hospital appointments.");
      } finally {
        setLoading(false);
      }
    };
    loadAppointments();
  }, []);

  const openModal = async () => {
    setForm(EMPTY_FORM);
    setModalError("");
    setSlotsData([]);
    setSelectedDate(null);
    setSelectedSlot(null);
    setShowModal(true);
    setModalLoading(true);
    try {
      const [ctxRes, patientsRes] = await Promise.all([
        api.get("/hospitals/me"),
        api.get("/hospitals/me/patients"),
      ]);
      const ctx = ctxRes?.data?.hospital ?? ctxRes?.data;
      const hid = ctx?.hospital_id ?? ctx?.id ?? null;
      setHospitalId(hid);
      setPatients(Array.isArray(patientsRes?.data?.patients) ? patientsRes.data.patients : []);
      if (hid) {
        const { data } = await api.get(`/hospitals/${hid}/doctors`);
        setHospitalDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
      }
    } catch {
      setModalError("Failed to load modal data.");
    } finally {
      setModalLoading(false);
    }
  };

  const closeModal = () => { setShowModal(false); setModalError(""); };

  const handleDoctorChange = async (doctorId) => {
    setForm((f) => ({ ...f, doctorId }));
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlotsData([]);
    if (!doctorId) return;
    setSlotsLoading(true);
    try {
      const { data } = await api.get(`/doctors/${doctorId}/availability`);
      const allSlots = Array.isArray(data?.slots) ? data.slots : [];
      const hospitalGroup = hospitalId
        ? allSlots.find((g) => String(g.hospitalId) === String(hospitalId))
        : allSlots[0];
      setSlotsData(hospitalGroup?.days ?? []);
    } catch {
      setSlotsData([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setModalError("");
    if (!form.patientId) { setModalError("Please select a patient."); return; }
    if (!form.doctorId) { setModalError("Please select a doctor."); return; }
    if (!selectedSlot) { setModalError("Please select an available slot."); return; }
    try {
      setCreating(true);
      await api.post("/hospitals/me/appointments", {
        patientId: Number(form.patientId),
        doctorId: Number(form.doctorId),
        date: selectedSlot.date,
        time: selectedSlot.start_time,
        type: form.type,
        reason: form.reason.trim(),
      });
      closeModal();
      const { data } = await api.get("/appointments");
      setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
    } catch (err) {
      setModalError(err?.response?.data?.message || "Failed to create appointment.");
    } finally {
      setCreating(false);
    }
  };

  const reloadAppointments = async () => {
    const { data } = await api.get("/appointments");
    setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
  };

  const handleCancel = async () => {
    try {
      setCancelling(true);
      await api.put(`/appointments/${cancelTarget.appointment_id}/cancel`);
      setCancelTarget(null);
      await reloadAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to cancel appointment.");
    } finally {
      setCancelling(false);
    }
  };

  const visibleAppointments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = appointments.filter((appointment) => {
      const statusMatches =
        statusFilter === "all" || normalizeAppointmentStatus(appointment?.appointment_status) === statusFilter;
      const typeMatches = typeFilter === "all" || getAppointmentType(appointment) === typeFilter;

      return statusMatches && typeMatches && matchesSearch(appointment, normalizedSearch);
    });

    return sortAppointments(filtered, sortBy);
  }, [appointments, searchTerm, sortBy, statusFilter, typeFilter]);

  const resultSummary = loading
    ? "Loading appointments..."
    : `${visibleAppointments.length} of ${appointments.length} appointments`;

  const shellClassName = "bg-white";

  return (
    <div className={shellClassName}>
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Create Appointment</h2>
              <button type="button" onClick={closeModal} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4 px-5 py-5">
              {modalError ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{modalError}</p>
              ) : null}
              {modalLoading ? (
                <p className="text-sm text-slate-400">Loading…</p>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Patient</label>
                    <select
                      required
                      value={form.patientId}
                      onChange={(e) => setForm((f) => ({ ...f, patientId: e.target.value }))}
                      className="input-soft"
                    >
                      <option value="">Select a patient</option>
                      {patients.map((p) => (
                        <option key={p.user_id} value={p.user_id}>
                          {p.full_name || `User #${p.user_id}`}{p.email ? ` — ${p.email}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Doctor</label>
                    <select
                      required
                      value={form.doctorId}
                      onChange={(e) => handleDoctorChange(e.target.value)}
                      className="input-soft"
                    >
                      <option value="">Select a doctor</option>
                      {hospitalDoctors.map((doc) => (
                        <option key={doc.user_id ?? doc.doctor_id} value={doc.user_id ?? doc.doctor_id}>
                          {doc.user_name || doc.full_name || `Doctor #${doc.user_id}`}
                          {doc.specialization_name ? ` — ${doc.specialization_name}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {form.doctorId && (
                    <div>
                      <label className="mb-1 block text-xs font-semibold text-slate-600">Available Slots</label>
                      {slotsLoading ? (
                        <p className="text-sm text-slate-400">Loading slots…</p>
                      ) : slotsData.length === 0 ? (
                        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">No available slots for this doctor.</p>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {slotsData.map((day) => {
                              const dateObj = new Date(day.date + "T00:00:00");
                              const label = dateObj.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
                              const hasAvailable = day.slots.some((s) => s.status === "available");
                              const isActive = selectedDate === day.date;
                              return (
                                <button
                                  key={day.date}
                                  type="button"
                                  disabled={!hasAvailable}
                                  onClick={() => { setSelectedDate(day.date); setSelectedSlot(null); }}
                                  className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                    isActive
                                      ? "border-slate-900 bg-slate-900 text-white"
                                      : hasAvailable
                                      ? "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                                      : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed"
                                  }`}
                                >
                                  {label}
                                </button>
                              );
                            })}
                          </div>

                          {selectedDate && (() => {
                            const day = slotsData.find((d) => d.date === selectedDate);
                            return day ? (
                              <div className="flex flex-wrap gap-1.5">
                                {day.slots.map((slot) => {
                                  const available = slot.status === "available";
                                  const isSelected = selectedSlot?.slotKey === slot.slotKey;
                                  return (
                                    <button
                                      key={slot.slotKey}
                                      type="button"
                                      disabled={!available}
                                      onClick={() => setSelectedSlot(available ? slot : null)}
                                      className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
                                        isSelected
                                          ? "border-emerald-600 bg-emerald-600 text-white"
                                          : available
                                          ? "border-slate-200 bg-white text-slate-700 hover:border-emerald-400 hover:text-emerald-700"
                                          : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed line-through"
                                      }`}
                                    >
                                      {formatSlotTime(slot.start_time)}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null;
                          })()}

                          {selectedSlot && (
                            <p className="text-xs text-emerald-700 font-semibold">
                              Selected: {new Date(selectedSlot.date + "T00:00:00").toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} at {formatSlotTime(selectedSlot.start_time)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                      className="input-soft"
                    >
                      <option value="physical">Physical (In-person)</option>
                      <option value="online">Online (Video)</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-semibold text-slate-600">Reason for Visit</label>
                    <textarea
                      rows={2}
                      value={form.reason}
                      onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="General consultation"
                      className="input-soft resize-none"
                    />
                  </div>
                </>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={closeModal} className="btn-ghost text-xs">Cancel</button>
                <button type="submit" disabled={creating || modalLoading} className="btn-primary text-xs disabled:opacity-60">
                  {creating ? "Creating…" : "Create Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={async () => { setRescheduleTarget(null); await reloadAppointments(); }}
        />
      )}

      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white shadow-2xl p-6">
            <h2 className="text-base font-bold text-slate-900">Cancel Appointment?</h2>
            <p className="mt-2 text-sm text-slate-500">
              This will cancel <span className="font-medium text-slate-800">{cancelTarget.patient_name}</span>'s appointment on{" "}
              <span className="font-medium text-slate-800">{formatShortDate(cancelTarget.appointment_date)}</span>.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setCancelTarget(null)} className="btn-ghost text-xs">Keep it</button>
              <button type="button" onClick={handleCancel} disabled={cancelling} className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60">
                {cancelling ? "Cancelling…" : "Yes, Cancel"}
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="min-h-full bg-white">
        {error ? (
          <div className="px-5 pt-5 sm:px-6 lg:px-7">
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          </div>
        ) : null}

        <div className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label className="relative w-full sm:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search patient, doctor, reason"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || appointments.length === 0}
              >
                {SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || appointments.length === 0}
              >
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Filter: {option.label}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || appointments.length === 0}
              >
                {TYPE_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Type: {option.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={openModal}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                <Plus className="h-4 w-4" />
                New Appointment
              </button>
            </div>
          </div>
        </div>

        <DataTable
          columns={APPOINTMENT_COLUMNS}
          data={visibleAppointments}
          getRowKey={(appointment) => appointment.appointment_id}
          loading={loading}
          loadingText="Loading appointments..."
          emptyText="No appointments found."
          pagination
          pageSize={10}
          resetPageKey={`${searchTerm}|${sortBy}|${statusFilter}|${typeFilter}`}
          renderRow={(appointment) => (
            <tr className="align-top transition hover:bg-slate-50/80">
              <td className="px-5 py-4 sm:px-6 lg:px-7">
                <div>
                  <p className="font-semibold text-slate-900">{appointment.patient_name || "Patient"}</p>
                  <p className="mt-1 text-xs text-slate-500">{appointment.patient_email || "-"}</p>
                </div>
              </td>
              <td className="px-5 py-4 text-slate-700">{appointment.doctor_name || "-"}</td>
              <td className="px-5 py-4 text-slate-600">{appointment.specialization_name || "-"}</td>
              <td className="px-5 py-4 text-slate-700">{formatShortDate(appointment.appointment_date)}</td>
              <td className="px-5 py-4 text-slate-700">{formatAppointmentTime(appointment.appointment_time)}</td>
              <td className="px-5 py-4 text-slate-700">{formatAppointmentType(appointment)}</td>
              <td className="px-5 py-4">
                <span
                  className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusClassName(
                    appointment.appointment_status
                  )}`}
                >
                  {formatStatusLabel(appointment.appointment_status)}
                </span>
              </td>
              <td className="px-5 py-4">
                {normalizeAppointmentStatus(appointment.appointment_status) === "scheduled" && (
                  <div className="flex items-center gap-2">
                    <ActionIconButton
                      icon={Pencil}
                      label="Reschedule"
                      tone="primary"
                      onClick={() => setRescheduleTarget(appointment)}
                    />
                    <ActionIconButton
                      icon={Trash2}
                      label="Cancel appointment"
                      tone="danger"
                      onClick={() => setCancelTarget(appointment)}
                    />
                  </div>
                )}
              </td>
            </tr>
          )}
        />
      </section>
    </div>
  );
};

export default HospitalAppointmentsWorkspace;
