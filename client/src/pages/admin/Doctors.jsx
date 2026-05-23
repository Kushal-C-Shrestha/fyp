import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import PageAlert from "../../components/ui/PageAlert";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const COLUMNS = [
  { label: "Name" },
  { label: "Specialization" },
  { label: "Email" },
  { label: "Phone" },
  { label: "Affiliated Hospitals" },
  { label: "Action" },
];

const AdminDoctors = () => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterText, setFilterText] = useState("");
  const [specFilter, setSpecFilter] = useState("");

  const loadDoctors = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/admin/doctors");
      setDoctors(Array.isArray(data?.doctors) ? data.doctors : []);
    } catch (err) {
      setDoctors([]);
      setError(err?.response?.data?.message || "Failed to load doctors.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm("Are you sure you want to completely delete this doctor from the platform? This will remove all their affiliated assignments and qualifications.")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.delete(`/admin/doctors/${doctorId}`);
      setSuccess("Doctor deleted successfully.");
      await loadDoctors();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete doctor.");
      setLoading(false);
    }
  };

  const specializations = useMemo(() => {
    const specs = new Set();
    doctors.forEach((doc) => {
      if (doc.specialization_name) {
        doc.specialization_name.split(",").forEach((s) => specs.add(s.trim()));
      }
    });
    return Array.from(specs).sort();
  }, [doctors]);

  const filteredDoctors = useMemo(() => {
    let result = doctors;

    const query = normalizeValue(filterText);
    if (query) {
      result = result.filter((doctor) =>
        [
          doctor.doctor_id,
          doctor.doctor_name,
          doctor.specialization_name,
          doctor.doctor_email,
          doctor.doctor_phone,
          doctor.affiliated_hospitals,
        ]
          .map(normalizeValue)
          .join(" ")
          .includes(query)
      );
    }

    if (specFilter) {
      const target = normalizeValue(specFilter);
      result = result.filter((doctor) =>
        normalizeValue(doctor.specialization_name).includes(target)
      );
    }

    return result;
  }, [doctors, filterText, specFilter]);

  return (
    <>
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchFilterBar
              value={filterText}
              onChange={setFilterText}
              placeholder="Search doctors..."
              maxWidth="sm:max-w-xs"
            />
            <select
              value={specFilter}
              onChange={(e) => setSpecFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              <option value="">All Specializations</option>
              {specializations.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <PageAlert type="error" message={error} className="mb-4" />
        {success && (
          <div className="mb-4">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          </div>
        )}

        <DataTable
          columns={COLUMNS}
          data={filteredDoctors}
          getRowKey={(doctor) => doctor.doctor_id}
          loading={loading}
          loadingText="Loading doctors..."
          emptyText="No doctors match the current filters."
          pagination
          pageSize={10}
          resetPageKey={`${filterText}-${specFilter}`}
          renderRow={(doctor) => (
            <tr className="hover:bg-slate-50/70" key={doctor.doctor_id}>
              <td className="px-4 py-3 font-bold text-slate-900">
                {doctor.doctor_name || "-"}
              </td>
              <td className="px-4 py-3 text-slate-700">{doctor.specialization_name || "-"}</td>
              <td className="px-4 py-3 text-slate-700">{doctor.doctor_email || "-"}</td>
              <td className="px-4 py-3 text-slate-700">{doctor.doctor_phone || "-"}</td>
              <td className="px-4 py-3 text-slate-700">
                <p className="max-w-sm whitespace-normal">{doctor.affiliated_hospitals || "-"}</p>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleDeleteDoctor(doctor.doctor_id)}
                  className="inline-flex items-center justify-center rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600 border border-rose-100 transition hover:bg-rose-100/70"
                >
                  Delete
                </button>
              </td>
            </tr>
          )}
        />
      </div>
    </>
  );
};

export default AdminDoctors;
