import React, { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import ActionIconButton from "../../components/ui/ActionIconButton";
import DataTable from "../../components/ui/DataTable";
import TabBar from "../../components/ui/TabBar";
import {
  formatShortDateTime,
  getMyHospitalContext,
  getStatusToneClasses,
  normalizeWorkflowStatus,
} from "../../utils/hospitalDashboard";
import { formatTime } from "../../utils/dateTime";
import api from "../../api/axios";
import guestUserImage from "../../assets/guest-user.svg";

const formatCurrency = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return "Flexible";
  return `NPR ${amount.toLocaleString()}`;
};

const formatSourceLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "hospital admin" || normalized === "hospital_admin") return "Hospital Invite";
  if (normalized === "admin") return "Admin Invite";
  return "Doctor Request";
};

const getPendingWithLabel = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "doctor") return "Waiting for doctor";
  if (normalized === "hospital") return "Waiting for hospital";
  return "Closed";
};

const formatRequestedScheduleRows = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const dayOfWeek = String(row?.day_of_week || "").trim();
      const startTime = row?.start_time ? formatTime(row.start_time) : "";
      const endTime = row?.end_time ? formatTime(row.end_time) : "";
      const slotInterval = Number(row?.slot_interval_minutes);

      if (!dayOfWeek || !startTime || !endTime) return "";

      return `${dayOfWeek}: ${startTime} to ${endTime}${
        Number.isFinite(slotInterval) && slotInterval > 0 ? ` (${slotInterval}m)` : ""
      }`;
    })
    .filter(Boolean);

const needsHospitalReview = (request) =>
  normalizeWorkflowStatus(request?.request_status) === "pending" &&
  normalizeWorkflowStatus(request?.hospital_approval_status) === "pending";

const REQUEST_COLUMNS = [
  { label: "Doctor", className: "sm:px-6 lg:px-7" },
  { label: "Source" },
  { label: "Proposed Fee" },
  { label: "Schedule" },
  { label: "Status & Action", className: "sm:px-6 lg:px-7" },
];

const getRequestTabs = (pendingCount, completedCount) => [
  { value: "pending", label: `Pending (${pendingCount})` },
  { value: "completed", label: `History (${completedCount})` },
];

const DoctorRequests = () => {
  const [hospital, setHospital] = useState(null);
  const [allDoctors, setAllDoctors] = useState([]);
  const [linkedDoctors, setLinkedDoctors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [notesById, setNotesById] = useState({});
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const hospitalContext = await getMyHospitalContext();
      const [requestsRes, doctorsRes, linkedDoctorsRes] = await Promise.all([
        api.get("/hospitals/me/assignment-requests"),
        api.get("/doctors", { params: { limit: 5000 } }),
        api.get(`/hospitals/${hospitalContext.hospital_id}/doctors`),
      ]);

      const nextRequests = Array.isArray(requestsRes?.data?.requests) ? requestsRes.data.requests : [];
      const nextDoctors = Array.isArray(doctorsRes?.data?.doctors) ? doctorsRes.data.doctors : [];
      const nextLinkedDoctors = Array.isArray(linkedDoctorsRes?.data?.doctors) ? linkedDoctorsRes.data.doctors : [];

      setHospital(hospitalContext);
      setRequests(nextRequests);
      setAllDoctors(nextDoctors);
      setLinkedDoctors(nextLinkedDoctors);
      setNotesById((prev) => ({
        ...Object.fromEntries(nextRequests.map((item) => [item.request_id, String(item.admin_notes || "")])),
        ...prev,
      }));
    } catch (err) {
      setHospital(null);
      setRequests([]);
      setAllDoctors([]);
      setLinkedDoctors([]);
      setError(err?.response?.data?.message || "Failed to load doctor affiliation requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingRequests = requests.filter(item => normalizeWorkflowStatus(item.request_status) === "pending");
  const completedRequests = requests.filter(item => normalizeWorkflowStatus(item.request_status) !== "pending");
  const visibleRequests = activeTab === "pending" ? pendingRequests : completedRequests;

  const selected = requests.find(r => r.request_id === selectedId) || null;

  const reviewRequest = async (requestId, status) => {
    try {
      setSubmittingId(requestId);
      setError("");
      setSuccess("");

      const response = await api.put(`/hospitals/me/assignment-requests/${requestId}/review`, {
        status,
        admin_notes: notesById[requestId] || "",
      });

      setSuccess(response?.data?.message || "Request updated.");
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update request.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <>
      <div className="bg-white">
        {error && (
          <div className="px-5 pt-5 sm:px-6 lg:px-7">
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="px-5 pt-5 sm:px-6 lg:px-7">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{success}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <TabBar
              tabs={getRequestTabs(pendingRequests.length, completedRequests.length)}
              value={activeTab}
              onChange={setActiveTab}
            />
            <p className="text-sm text-slate-500">
              {loading ? "Loading requests..." : `${visibleRequests.length} ${activeTab} requests`}
            </p>
          </div>
        </div>

        <DataTable
          columns={REQUEST_COLUMNS}
          data={visibleRequests}
          getRowKey={(item) => item.request_id}
          loading={loading}
          loadingText="Fetching requests..."
          emptyText={`No ${activeTab} affiliation requests found.`}
          pagination
          pageSize={10}
          resetPageKey={activeTab}
          renderRow={(item) => {
                  const canReview = needsHospitalReview(item);
                  const scheduleRows = formatRequestedScheduleRows(item.requested_schedule);
                  
                  return (
                    <tr className="group align-top transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4 sm:px-6 lg:px-7">
                        <div className="flex items-start gap-4">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-400 overflow-hidden border border-slate-200">
                             {item.doctor_profile_picture ? (
                               <img src={item.doctor_profile_picture} alt="" className="h-full w-full object-cover" />
                             ) : item.doctor_name?.[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 leading-none">{item.doctor_name}</p>
                            <p className="text-[11px] font-medium text-slate-400 mt-1.5">{item.department_name || "General Medicine"}</p>
                            {item.request_message && (
                               <p className="mt-2 text-xs text-slate-500 line-clamp-2 italic leading-relaxed">
                                 "{item.request_message}"
                               </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                            {formatSourceLabel(item.request_source)}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatShortDateTime(item.updated_at || item.created_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-700">
                        {formatCurrency(item.consultation_fee)}
                      </td>
                      <td className="px-5 py-4">
                        {scheduleRows.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                            {scheduleRows.map((line, idx) => (
                              <span key={idx} className="inline-flex text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                                {line}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 italic">No slots</span>
                        )}
                      </td>
                      <td className="px-5 py-4 sm:px-6 lg:px-7">
                        <div className="flex flex-col gap-3 min-w-[170px]">
                          <div className="flex items-center gap-2">
                             <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-widest ${getStatusToneClasses(item.request_status)}`}>
                              {item.request_status}
                            </span>
                          </div>

                          {canReview && (
                            <div className="space-y-2">
                              <input
                                type="text"
                                value={notesById[item.request_id] || ""}
                                onChange={(e) =>
                                  setNotesById((prev) => ({ ...prev, [item.request_id]: e.target.value }))
                                }
                                className="w-full px-3 py-1.5 text-[11px] rounded border border-slate-200 outline-none focus:border-slate-400 transition"
                                placeholder="Decision note..."
                              />
                              <div className="flex items-center gap-2">
                                <ActionIconButton
                                  icon={Check}
                                  label="Approve link"
                                  tone="success"
                                  onClick={() => reviewRequest(item.request_id, "approved")}
                                  disabled={submittingId === item.request_id}
                                />
                                <ActionIconButton
                                  icon={X}
                                  label="Reject link"
                                  tone="danger"
                                  onClick={() => reviewRequest(item.request_id, "rejected")}
                                  disabled={submittingId === item.request_id}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }}
        />
      </div>
    </>
  );
};

export default DoctorRequests;
