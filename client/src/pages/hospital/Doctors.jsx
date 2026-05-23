import React, { useEffect, useMemo, useState } from "react";
import { Plus, Search, X } from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import { getMyHospitalContext } from "../../utils/hospitalDashboard";
import api from "../../api/axios";
import guestUserImage from "../../assets/guest-user.svg";

const DOCTOR_SORT_OPTIONS = [
  { value: "name_az", label: "Name A-Z" },
  { value: "name_za", label: "Name Z-A" },
  { value: "rating_high", label: "Rating High-Low" },
];

const DOCTOR_COLUMNS = [
  { label: "Doctor", className: "sm:px-6 lg:px-7" },
  { label: "Email" },
  { label: "Specialization" },
  { label: "Rating" },
  { label: "Reviews", className: "sm:px-6 lg:px-7" },
  { label: "Action", className: "sm:px-6 lg:px-7" },
];

const Doctors = () => {
  const [hospitalId, setHospitalId] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("name_az");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [isInviteFormOpen, setIsInviteFormOpen] = useState(false);
  const [inviteSearchTerm, setInviteSearchTerm] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    doctor_id: "",
    consultation_fee: "",
    request_message: "",
    requested_schedule: [
      { day_of_week: "Monday", start_time: "09:00", end_time: "17:00", slot_interval_minutes: 20 }
    ],
  });

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError("");

      const hospitalContext = await getMyHospitalContext();
      const currentHospitalId = hospitalContext?.hospital_id || null;
      const [linkedDoctorsRes, allDoctorsRes, requestsRes] = await Promise.all([
        api.get(`/hospitals/${currentHospitalId}/doctors`),
        api.get("/doctors", { params: { limit: 5000 } }),
        api.get("/hospitals/me/assignment-requests"),
      ]);

      setHospitalId(currentHospitalId);
      setDoctors(Array.isArray(linkedDoctorsRes?.data?.doctors) ? linkedDoctorsRes.data.doctors : []);
      setAllDoctors(Array.isArray(allDoctorsRes?.data?.doctors) ? allDoctorsRes.data.doctors : []);
      setRequests(Array.isArray(requestsRes?.data?.requests) ? requestsRes.data.requests : []);
    } catch (err) {
      setHospitalId(null);
      setDoctors([]);
      setAllDoctors([]);
      setRequests([]);
      setError(err?.response?.data?.message || "Failed to load hospital doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const specializationOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        doctors
          .map((doctor) => String(doctor?.specialization_name || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["all", ...values];
  }, [doctors]);

  const visibleDoctors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = doctors.filter((doctor) => {
      const specializationName = String(doctor?.specialization_name || "").trim();
      const specializationMatches = specializationFilter === "all" || specializationName === specializationFilter;

      if (!specializationMatches) return false;

      if (!query) return true;

      const haystack = [doctor?.user_name, doctor?.user_email, doctor?.specialization_name, doctor?.user_id]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorted = [...filtered];

    if (sortBy === "name_za") {
      sorted.sort((a, b) => String(b?.user_name || "").localeCompare(String(a?.user_name || "")));
    } else if (sortBy === "rating_high") {
      sorted.sort((a, b) => Number(b?.avg_rating || 0) - Number(a?.avg_rating || 0));
    } else {
      sorted.sort((a, b) => String(a?.user_name || "").localeCompare(String(b?.user_name || "")));
    }

    return sorted;
  }, [doctors, searchTerm, sortBy, specializationFilter]);

  const availableDoctors = useMemo(() => {
    const linkedDoctorIds = new Set(doctors.map((doctor) => Number(doctor.user_id)).filter(Number.isInteger));
    const pendingDoctorIds = new Set(
      requests
        .filter((request) => String(request?.request_status || "").trim().toLowerCase() === "pending")
        .map((request) => Number(request.doctor_id))
        .filter(Number.isInteger)
    );

    return allDoctors.filter((doctor) => {
      const doctorId = Number(doctor.user_id);
      return Number.isInteger(doctorId) && !linkedDoctorIds.has(doctorId) && !pendingDoctorIds.has(doctorId);
    });
  }, [allDoctors, doctors, requests]);

  const selectedDoctor = useMemo(
    () => availableDoctors.find((doctor) => String(doctor.user_id) === String(inviteForm.doctor_id)) || null,
    [availableDoctors, inviteForm.doctor_id]
  );

  const updateInviteField = (field, value) => {
    setInviteForm((prev) => ({ ...prev, [field]: value }));
    setError("");
    setSuccess("");
  };

  const resetInviteForm = () => {
    setInviteForm({
      doctor_id: "",
      consultation_fee: "",
      request_message: "",
      requested_schedule: [{ day_of_week: "Monday", start_time: "09:00", end_time: "17:00", slot_interval_minutes: 20 }]
    });
    setInviteSearchTerm("");
    setInviteSubmitting(false);
  };

  const filteredAvailableDoctors = useMemo(() => {
    const query = inviteSearchTerm.trim().toLowerCase();
    if (!query) return availableDoctors;

    return availableDoctors.filter((doctor) => {
      const haystack = [
        doctor.user_name,
        doctor.specialization_name,
        doctor.user_email,
        String(doctor.user_id),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [availableDoctors, inviteSearchTerm]);

  const submitInvite = async () => {
    const doctorId = Number(inviteForm.doctor_id);
    if (!Number.isInteger(doctorId)) {
      setError("Select a doctor to continue.");
      setSuccess("");
      return;
    }

    const consultationFeeText = String(inviteForm.consultation_fee || "").trim();
    const consultationFee = consultationFeeText ? Number(consultationFeeText) : null;
    if (consultationFeeText && (!Number.isFinite(consultationFee) || consultationFee < 0)) {
      setError("Consultation fee must be a valid positive number.");
      setSuccess("");
      return;
    }

    // Validate schedule
    const schedule = inviteForm.requested_schedule.filter(s => s.day_of_week && s.start_time && s.end_time);
    if (schedule.length === 0) {
      setError("Please add at least one day to the schedule.");
      return;
    }

    try {
      setInviteSubmitting(true);
      setError("");
      setSuccess("");

      const payload = { 
        doctor_id: doctorId,
        requested_schedule: schedule
      };
      if (hospitalId) payload.hospital_id = hospitalId;
      if (Number.isFinite(consultationFee)) payload.consultation_fee = consultationFee;
      if (String(inviteForm.request_message || "").trim()) {
        payload.request_message = String(inviteForm.request_message).trim();
      }

      const response = await api.post("/hospitals/me/assignment-requests", payload);
      setSuccess(response?.data?.message || "Doctor invitation sent.");
      resetInviteForm();
      setIsInviteFormOpen(false);
      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to send doctor invitation.");
    } finally {
      setInviteSubmitting(false);
    }
  };

  const handleRemoveDoctor = async (doctorId, assignmentId) => {
    if (!assignmentId) {
      setError("Cannot remove doctor: assignment ID is missing.");
      return;
    }
    if (!window.confirm("Are you sure you want to remove this doctor from your hospital?")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.delete(`/doctors/${doctorId}/assignments/${assignmentId}`);
      setSuccess("Doctor removed from hospital successfully.");
      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to remove doctor.");
      setLoading(false);
    }
  };

  return (
    <>
      <>
        <div className="bg-white">
          {error ? (
            <div className="px-5 pt-5 sm:px-6 lg:px-7">
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
            </div>
          ) : null}
          {success ? (
            <div className="px-5 pt-5 sm:px-6 lg:px-7">
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
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
                    placeholder="Search doctor or specialization"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100"
                  />
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                  disabled={loading || doctors.length === 0}
                >
                  {DOCTOR_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={specializationFilter}
                  onChange={(event) => setSpecializationFilter(event.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                  disabled={loading || doctors.length === 0}
                >
                  {specializationOptions.map((option) => (
                    <option key={option} value={option}>
                      {option === "all" ? "Filter: All specializations" : `Filter: ${option}`}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => {
                    setIsInviteFormOpen((prev) => !prev);
                    setError("");
                    setSuccess("");
                  }}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  Add Doctor
                </button>
              </div>
            </div>
          </div>

          {isInviteFormOpen ? (
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6 lg:px-7">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search doctors to invite..."
                    className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-sky-100"
                    value={inviteSearchTerm}
                    onChange={(e) => setInviteSearchTerm(e.target.value)}
                  />
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px]">
                  <select
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                    value={inviteForm.doctor_id}
                    onChange={(event) => updateInviteField("doctor_id", event.target.value)}
                    disabled={inviteSubmitting || availableDoctors.length === 0}
                  >
                    <option value="">{availableDoctors.length === 0 ? "No doctors available" : `Select doctor (${filteredAvailableDoctors.length} found)`}</option>
                    {filteredAvailableDoctors.map((doctor) => (
                      <option key={doctor.user_id} value={doctor.user_id}>
                        {doctor.user_name || "Doctor"} - {doctor.specialization_name || "General Medicine"}
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="Fee (optional)"
                    className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                    value={inviteForm.consultation_fee}
                    onChange={(event) => updateInviteField("consultation_fee", event.target.value)}
                    disabled={inviteSubmitting}
                  />
                </div>

                <textarea
                  rows={2}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
                  placeholder="Message for the doctor"
                  value={inviteForm.request_message}
                  onChange={(event) => updateInviteField("request_message", event.target.value)}
                  disabled={inviteSubmitting}
                />

                <div className="mt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-800">Proposed Schedule</h4>
                    <button
                      type="button"
                      onClick={() => setInviteForm(prev => ({
                        ...prev,
                        requested_schedule: [...prev.requested_schedule, { day_of_week: "Monday", start_time: "09:00", end_time: "17:00", slot_interval_minutes: 20 }]
                      }))}
                      className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
                    >
                      + Add Day
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {inviteForm.requested_schedule.map((row, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2 sm:grid-cols-4 items-end bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Day</label>
                          <select
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs outline-none bg-white"
                            value={row.day_of_week}
                            onChange={(e) => {
                              const next = [...inviteForm.requested_schedule];
                              next[index].day_of_week = e.target.value;
                              setInviteForm(prev => ({ ...prev, requested_schedule: next }));
                            }}
                          >
                            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                              <option key={day} value={day}>{day}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Start</label>
                          <input
                            type="time"
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs outline-none bg-white"
                            value={row.start_time}
                            onChange={(e) => {
                              const next = [...inviteForm.requested_schedule];
                              next[index].start_time = e.target.value;
                              setInviteForm(prev => ({ ...prev, requested_schedule: next }));
                            }}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">End</label>
                          <input
                            type="time"
                            className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs outline-none bg-white"
                            value={row.end_time}
                            onChange={(e) => {
                              const next = [...inviteForm.requested_schedule];
                              next[index].end_time = e.target.value;
                              setInviteForm(prev => ({ ...prev, requested_schedule: next }));
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Slot (m)</label>
                            <input
                              type="number"
                              className="w-full h-8 px-2 rounded-lg border border-slate-200 text-xs outline-none bg-white"
                              value={row.slot_interval_minutes}
                              onChange={(e) => {
                                const next = [...inviteForm.requested_schedule];
                                next[index].slot_interval_minutes = Number(e.target.value);
                                setInviteForm(prev => ({ ...prev, requested_schedule: next }));
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = inviteForm.requested_schedule.filter((_, i) => i !== index);
                              setInviteForm(prev => ({ ...prev, requested_schedule: next }));
                            }}
                            className="text-rose-500 hover:text-rose-600 mb-1"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {selectedDoctor ? (
                <div className="mt-3 flex items-center gap-3">
                  <img
                    src={selectedDoctor.user_profile_picture || guestUserImage}
                    alt={selectedDoctor.user_name || "Doctor"}
                    className="h-10 w-10 rounded-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = guestUserImage;
                    }}
                  />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{selectedDoctor.user_name || "Doctor"}</p>
                    <p className="text-xs text-slate-500">
                      {selectedDoctor.specialization_name || "General Medicine"}
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={submitInvite}
                  disabled={inviteSubmitting || !inviteForm.doctor_id}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {inviteSubmitting ? "Sending..." : "Send Invitation"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetInviteForm();
                    setIsInviteFormOpen(false);
                    setError("");
                    setSuccess("");
                  }}
                  disabled={inviteSubmitting}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>

              {availableDoctors.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  No doctors are currently available to invite.
                </p>
              ) : null}
            </div>
          ) : null}

          <DataTable
            columns={DOCTOR_COLUMNS}
            data={visibleDoctors}
            getRowKey={(doctor) => doctor.user_id}
            loading={loading}
            loadingText="Loading doctors..."
            emptyText="No doctors found."
            pagination
            pageSize={10}
            resetPageKey={`${searchTerm}|${specializationFilter}|${sortBy}`}
            renderRow={(doctor) => (
              <tr className="hover:bg-slate-50/70">
                <td className="px-5 py-4 sm:px-6 lg:px-7">
                  <div className="flex items-center gap-3">
                    <img
                      src={doctor.user_profile_picture || guestUserImage}
                      alt={doctor.user_name || "Doctor"}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(event) => {
                        event.currentTarget.src = guestUserImage;
                      }}
                    />
                    <div>
                      <p className="font-semibold text-slate-900">{doctor.user_name || "Doctor"}</p>
                      <p className="text-xs text-slate-500">Doctor ID: {doctor.user_id || "-"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4 text-slate-700">{doctor.user_email || "-"}</td>
                <td className="px-5 py-4 text-slate-700">{doctor.specialization_name || "-"}</td>
                <td className="px-5 py-4 text-slate-700">{Number(doctor.avg_rating || 0).toFixed(1)}</td>
                <td className="px-5 py-4 text-slate-700 sm:px-6 lg:px-7">{Number(doctor.review_count || 0)}</td>
                <td className="px-5 py-4 sm:px-6 lg:px-7">
                  <button
                    onClick={() => handleRemoveDoctor(doctor.user_id, doctor.assignment_id)}
                    className="inline-flex items-center justify-center rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 border border-rose-100 transition hover:bg-rose-100/70"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )}
          />
        </div>
      </>
    </>
  );
};

export default Doctors;
