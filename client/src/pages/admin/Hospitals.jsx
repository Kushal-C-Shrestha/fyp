import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import PageAlert from "../../components/ui/PageAlert";

const normalizeValue = (value) => String(value || "").trim().toLowerCase();

const COLUMNS = [
  { label: "Hospital" },
  { label: "Address" },
  { label: "Email" },
  { label: "Contacts" },
  { label: "Admin Contacts" },
  { label: "Action" },
];

const AdminHospitals = () => {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filterText, setFilterText] = useState("");
  const [deptFilter, setDeptFilter] = useState("");

  const loadHospitals = async () => {
    try {
      setLoading(true);
      setError("");
      const { data } = await api.get("/admin/hospitals");
      setHospitals(Array.isArray(data?.hospitals) ? data.hospitals : []);
    } catch (err) {
      setHospitals([]);
      setError(err?.response?.data?.message || "Failed to load hospitals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHospitals();
  }, []);

  const handleDeleteHospital = async (hospitalId) => {
    if (!window.confirm("Are you sure you want to completely delete this hospital? This will remove all its affiliated assignments, departments, facilities, and reviews.")) {
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");
      await api.delete(`/admin/hospitals/${hospitalId}`);
      setSuccess("Hospital deleted successfully.");
      await loadHospitals();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to delete hospital.");
      setLoading(false);
    }
  };

  const departments = useMemo(() => {
    const depts = new Set();
    hospitals.forEach((h) => {
      if (Array.isArray(h.departments)) {
        h.departments.forEach((d) => depts.add(d.trim()));
      }
    });
    return Array.from(depts).sort();
  }, [hospitals]);

  const filteredHospitals = useMemo(() => {
    let result = hospitals;

    const query = normalizeValue(filterText);
    if (query) {
      result = result.filter((hospital) =>
        [
          hospital.hospital_name,
          hospital.hospital_address,
          hospital.hospital_primary_email,
          hospital.hospital_primary_phone,
          hospital.hospital_reception_phone,
          hospital.admin_contacts,
        ]
          .map(normalizeValue)
          .join(" ")
          .includes(query)
      );
    }

    if (deptFilter) {
      const target = normalizeValue(deptFilter);
      result = result.filter((hospital) =>
        Array.isArray(hospital.departments) &&
        hospital.departments.some((d) => normalizeValue(d) === target)
      );
    }

    return result;
  }, [filterText, hospitals, deptFilter]);

  return (
    <>
      <div>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchFilterBar
              value={filterText}
              onChange={setFilterText}
              placeholder="Search hospitals..."
              maxWidth="sm:max-w-xs"
            />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
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
          data={filteredHospitals}
          getRowKey={(hospital) => hospital.hospital_id}
          loading={loading}
          loadingText="Loading hospitals..."
          emptyText="No hospitals match the current filters."
          pagination
          pageSize={10}
          resetPageKey={`${filterText}-${deptFilter}`}
          renderRow={(hospital) => (
            <tr className="hover:bg-slate-50/70" key={hospital.hospital_id}>
              <td className="px-4 py-3 font-bold text-slate-900">
                <p className="max-w-[200px] whitespace-normal break-words">{hospital.hospital_name || "-"}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">
                <p className="max-w-xs whitespace-normal">{hospital.hospital_address || "-"}</p>
              </td>
              <td className="px-4 py-3 text-slate-700">{hospital.hospital_primary_email || "-"}</td>
              <td className="px-4 py-3 text-slate-700">
                <div className="text-xs">
                  <p><span className="font-semibold text-slate-500">Phone:</span> {hospital.hospital_primary_phone || "-"}</p>
                  <p className="mt-0.5"><span className="font-semibold text-slate-500">Reception:</span> {hospital.hospital_reception_phone || "-"}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-700">
                <p className="max-w-sm whitespace-normal">{hospital.admin_contacts || "-"}</p>
              </td>
              <td className="px-4 py-3">
                <button
                  type="button"
                  onClick={() => handleDeleteHospital(hospital.hospital_id)}
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

export default AdminHospitals;
