import React, { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import ActionIconButton from "../../components/ui/ActionIconButton";
import DataTable from "../../components/ui/DataTable";
import TabBar from "../../components/ui/TabBar";
import {
  formatShortDate,
  formatShortDateTime,
  getMyHospitalContext,
  getStatusToneClasses,
  normalizeWorkflowStatus,
} from "../../utils/hospitalDashboard";
import { formatTime } from "../../utils/dateTime";
import api from "../../api/axios";
import guestUserImage from "../../assets/guest-user.svg";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const formatText = (value) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
};

const formatLeaveType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "custom_hours") return "Partial Day";
  if (normalized === "multi_day") return "Multi Day";
  return "Full Day";
};

const formatRequestType = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized === "schedule_change" ? "Schedule Change" : "Leave";
};

const formatRequestWindow = (request) => {
  if (String(request?.request_type || "").trim().toLowerCase() === "schedule_change") {
    return request?.effective_from ? `Effective ${formatShortDate(request.effective_from)}` : "Schedule update";
  }

  const startText = formatShortDate(request?.start_date);
  const endText = formatShortDate(request?.end_date);
  const dateRange =
    request?.start_date && request?.end_date && request.start_date !== request.end_date
      ? `${startText} to ${endText}`
      : startText || endText || "-";

  if (String(request?.leave_type || "").trim().toLowerCase() === "custom_hours") {
    const startTime = request?.start_time ? formatTime(request.start_time, "-") : "-";
    const endTime = request?.end_time ? formatTime(request.end_time, "-") : "-";
    return `${dateRange} | ${startTime} to ${endTime}`;
  }

  return dateRange;
};

const formatScheduleRows = (rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return "-";
  return rows
    .map((row) => {
      const day = formatText(row?.day_of_week);
      const start = row?.start_time ? formatTime(row.start_time, "-") : "-";
      const end = row?.end_time ? formatTime(row.end_time, "-") : "-";
      const interval = Number(row?.slot_interval_minutes) > 0 ? ` (${row.slot_interval_minutes}m)` : "";
      return `${day}: ${start} to ${end}${interval}`;
    })
    .join(", ");
};

const getRequestKey = (request) => `${request?.request_type || "request"}-${request?.request_id || "0"}`;

const REQUEST_COLUMNS = [
  { label: "Doctor", className: "sm:px-6 lg:px-7" },
  { label: "Request Type" },
  { label: "Requested Period" },
  { label: "Details / Reason" },
  { label: "Review Action", className: "sm:px-6 lg:px-7" },
];

const getRequestTabs = (pendingCount, completedCount) => [
  { value: "pending", label: `Pending (${pendingCount})` },
  { value: "completed", label: `History (${completedCount})` },
];

const DetailRow = ({ label, value }) => (
  <div className="grid gap-2 border-t border-slate-200 py-3 md:grid-cols-[220px_minmax(0,1fr)]">
    <dt className="text-sm font-medium text-slate-500">{label}</dt>
    <dd className="min-w-0 break-words text-sm text-slate-900">{value}</dd>
  </div>
);

const SectionHeading = ({ children }) => (
  <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{children}</h2>
);

const ScheduleRequests = () => {
  const [hospital, setHospital] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const hospitalContext = await getMyHospitalContext();
      const { data } = await api.get("/hospitals/me/schedule-requests");
      setHospital(hospitalContext);
      setRequests(Array.isArray(data?.requests) ? data.requests : []);
    } catch (err) {
      setHospital(null);
      setRequests([]);
      setError(err?.response?.data?.message || "Failed to load schedule requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const pendingRequests = requests.filter(item => normalizeWorkflowStatus(item.status) === "pending");
  const completedRequests = requests.filter(item => normalizeWorkflowStatus(item.status) !== "pending");
  const visibleRequests = activeTab === "pending" ? pendingRequests : completedRequests;

  const selected = requests.find(r => r.request_id === selectedId) || null;

  const updateRequestStatus = async (request, status) => {
    try {
      setUpdatingId(request.request_id);
      setError("");
      setSuccess("");
      const { data } = await api.put(`/hospitals/me/schedule-requests/${request.request_id}/review`, {
        status,
        request_type: request.request_type,
      });
      setSuccess(data?.message || "Request updated.");
      await loadRequests();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update schedule request.");
    } finally {
      setUpdatingId(null);
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
          getRowKey={getRequestKey}
          loading={loading}
          loadingText="Loading requests..."
          emptyText="No pending requests in this category."
          pagination
          pageSize={10}
          resetPageKey={activeTab}
          renderRow={(item) => {
                  const isScheduleChange = normalizeValue(item.request_type) === "schedule_change";
                  const canReview = normalizeWorkflowStatus(item.status) === "pending";
                  
                  return (
                    <tr className="align-top transition-colors hover:bg-slate-50/70">
                      <td className="px-5 py-4 sm:px-6 lg:px-7">
                        <div className="flex items-start gap-4">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-400">
                            {item.doctor_profile_picture ? (
                              <img
                                src={item.doctor_profile_picture}
                                alt={item.doctor_name || "Doctor"}
                                className="h-full w-full object-cover"
                                onError={(event) => {
                                  event.currentTarget.src = guestUserImage;
                                }}
                              />
                            ) : (
                              item.doctor_name?.[0] || "D"
                            )}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold leading-none text-slate-900">{item.doctor_name}</span>
                            <span className="mt-2 block text-[10px] text-slate-400">
                              Submitted {formatShortDateTime(item.created_at)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                         <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded whitespace-nowrap">
                           {formatRequestType(item.request_type)}
                         </span>
                      </td>
                      <td className="px-5 py-4">
                         <div className="text-[11px] font-bold text-slate-700">
                           {isScheduleChange 
                             ? `Effective ${item.effective_from ? formatShortDate(item.effective_from) : "immediately"}`
                             : formatRequestWindow(item)
                           }
                         </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="max-w-xs">
                          {isScheduleChange ? (
                             <div className="flex flex-wrap gap-1">
                               {Array.isArray(item.requested_schedule) && item.requested_schedule.map((row, idx) => (
                                  <span key={idx} className="inline-flex text-[10px] font-medium text-slate-500 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded">
                                    {row.day_of_week?.[0]} {formatTime(row.start_time, "-")}
                                  </span>
                               ))}
                             </div>
                          ) : (
                             <p className="text-xs text-slate-500 italic leading-relaxed">
                               {item.reason || "No reason provided"}
                             </p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 sm:px-6 lg:px-7">
                        <div className="flex flex-col gap-2 min-w-[120px]">
                           {canReview ? (
                             <div className="flex items-center gap-2">
                               <ActionIconButton
                                 icon={Check}
                                 label="Approve request"
                                 tone="success"
                                 onClick={() => updateRequestStatus(item, "approved")}
                                 disabled={updatingId === item.request_id}
                               />
                               <ActionIconButton
                                 icon={X}
                                 label="Reject request"
                                 tone="danger"
                                 onClick={() => updateRequestStatus(item, "rejected")}
                                 disabled={updatingId === item.request_id}
                               />
                             </div>
                           ) : (
                             <span className={`w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${getStatusToneClasses(item.status)}`}>
                               {item.status}
                             </span>
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

export default ScheduleRequests;
