import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { Eye } from "lucide-react";
import ActionIconButton from "../../components/ui/ActionIconButton";
import DataTable from "../../components/ui/DataTable";
import SearchFilterBar from "../../components/ui/SearchFilterBar";

const formatAppointmentDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const formatText = (value) => {
  const normalized = String(value || "").trim();
  return normalized || "-";
};

const COLUMNS = [
  { label: "Doctor Details" },
  { label: "Specialization" },
  { label: "Status" },
  { label: "Submitted" },
  { label: "Action", className: "text-right" },
];

const AdminDoctorRequests = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterText, setFilterText] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/admin/doctor-requests");
        setRequests(Array.isArray(data?.requests) ? data.requests : []);
      } catch (err) {
        setRequests([]);
        setError(err?.response?.data?.message || "Failed to load doctor requests.");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const query = normalizeValue(filterText);
    if (!query) return requests;

    return requests.filter((request) =>
      [
        request.request_id,
        request.doctor_name,
        request.doctor_email,
        request.doctor_phone,
        request.request_status,
        Array.isArray(request.specializations) ? request.specializations.join(" ") : "",
      ]
        .map(normalizeValue)
        .join(" ")
        .includes(query)
    );
  }, [filterText, requests]);

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-end">
          <SearchFilterBar
            value={filterText}
            onChange={setFilterText}
            placeholder="Search doctor requests..."
            maxWidth="sm:max-w-xs"
          />
        </div>

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <DataTable
          columns={COLUMNS}
          data={filteredRequests}
          getRowKey={(request) => request.request_id}
          loading={loading}
          loadingText="Loading doctor requests..."
          emptyText="No doctor requests found matching your search."
          pagination
          pageSize={10}
          resetPageKey={filterText}
          renderRow={(request) => (
                  <tr
                    key={request.request_id}
                    onClick={() => navigate(`/dashboard/super-admin/requests/doctors/${request.request_id}`)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                         <span className="font-semibold text-slate-900">{formatText(request.doctor_name)}</span>
                         <span className="text-xs text-slate-500">{formatText(request.doctor_email)}</span>
                         <span className="text-xs text-slate-400 mt-0.5">{formatText(request.doctor_address)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                         {Array.isArray(request.specializations) && request.specializations.slice(0, 2).map((s, i) => (
                            <span key={i} className="text-xs text-slate-600">
                               {s}{i < 1 && request.specializations.length > 1 ? ',' : ''}
                            </span>
                         ))}
                         {request.specializations?.length > 2 && <span className="text-xs text-slate-400">+{request.specializations.length - 2}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
                        request.request_status === 'pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        request.request_status === 'approved' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {request.request_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatAppointmentDate(request.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionIconButton icon={Eye} label="View request" tone="primary" />
                    </td>
                  </tr>
          )}
        />
      </div>
    </>
  );
};

export default AdminDoctorRequests;
