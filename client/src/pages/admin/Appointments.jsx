import React, { useEffect, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";

const formatAppointmentDate = (value) => {
  if (!value) return '-';
  return new Date(value).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
};

const COLUMNS = [
  { label: "Patient" },
  { label: "Doctor" },
  { label: "Hospital" },
  { label: "Date & Time" },
  { label: "Status" },
];

const AdminAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/appointments", {
          params: { search: debouncedSearch }
        });
        setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
      } catch (err) {
        setAppointments([]);
        setError(err?.response?.data?.message || "Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [debouncedSearch]);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <div className="relative w-full sm:max-w-sm">
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search patients, doctors, or hospitals..."
              className="h-10 w-full border border-slate-200 rounded-lg px-3 pr-10 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-100"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {loading && searchText ? (
                 <div className="h-4 w-4 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              ) : (
                <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        ) : null}

        <DataTable
          columns={COLUMNS}
          data={appointments}
          getRowKey={(item) => item.appointment_id}
          loading={loading && !debouncedSearch}
          loadingText="Loading appointments..."
          emptyText="No appointments found matching your search."
          pagination
          pageSize={10}
          resetPageKey={debouncedSearch}
          renderRow={(item) => (
                  <tr key={item.appointment_id}>
                    <td className="px-4 py-3 text-slate-900">{item.patient_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">Dr. {item.doctor_name || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.hospital_name || "Online Consultation"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatAppointmentDate(item.appointment_date)} at {item.appointment_time || "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                       <span className="capitalize font-medium">{item.appointment_status || "-"}</span>
                    </td>
                  </tr>
          )}
        />
      </div>
    </>
  );
};

export default AdminAppointments;
