import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import api from "../../api/axios";
import guestUserImage from "../../assets/guest-user.svg";
import { formatShortDate } from "../../utils/hospitalDashboard";

const PATIENT_SORT_OPTIONS = [
  { value: "recent_visit", label: "Recent visit" },
  { value: "name_az", label: "Name A-Z" },
  { value: "appointments_high", label: "Most appointments" },
];

const PATIENT_COLUMNS = [
  { label: "Patient", className: "sm:px-6 lg:px-7" },
  { label: "Email" },
  { label: "Phone" },
  { label: "Last Visit" },
  { label: "Last Doctor" },
  { label: "Appointments", className: "sm:px-6 lg:px-7" },
];

const getPatientKey = (appointment, index) => {
  const rawKey =
    appointment?.patient_id ||
    appointment?.patient_user_id ||
    appointment?.user_id ||
    appointment?.patient_email ||
    appointment?.patient_name;

  if (rawKey === null || rawKey === undefined || rawKey === "") {
    return `patient-${index}`;
  }

  return String(rawKey);
};

const Patients = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("recent_visit");
  const [doctorFilter, setDoctorFilter] = useState("all");

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/appointments");
        setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
      } catch (err) {
        setAppointments([]);
        setError(err?.response?.data?.message || "Failed to load hospital patients.");
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const patients = useMemo(() => {
    const byPatient = new Map();

    appointments.forEach((item, index) => {
      const key = getPatientKey(item, index);
      const dateValue = item?.appointment_date || "";
      const parsedDate = new Date(dateValue);
      const timestamp = Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();

      const current = byPatient.get(key) || {
        id: key,
        name: item?.patient_name || "Patient",
        email: item?.patient_email || "-",
        phone: item?.patient_phone || "-",
        image: item?.patient_image || "",
        totalAppointments: 0,
        lastVisitDate: "",
        lastVisitTs: 0,
        lastDoctorName: item?.doctor_name || "-",
      };

      current.totalAppointments += 1;

      if (timestamp >= current.lastVisitTs) {
        current.lastVisitTs = timestamp;
        current.lastVisitDate = dateValue;
        current.lastDoctorName = item?.doctor_name || current.lastDoctorName || "-";
      }

      byPatient.set(key, current);
    });

    return Array.from(byPatient.values());
  }, [appointments]);

  const doctorOptions = useMemo(() => {
    const values = Array.from(
      new Set(
        patients
          .map((patient) => String(patient?.lastDoctorName || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["all", ...values];
  }, [patients]);

  const visiblePatients = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = patients.filter((patient) => {
      const doctorMatches = doctorFilter === "all" || patient.lastDoctorName === doctorFilter;
      if (!doctorMatches) return false;

      if (!query) return true;

      const haystack = [patient.name, patient.email, patient.phone, patient.lastDoctorName]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorted = [...filtered];

    if (sortBy === "name_az") {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
      return sorted;
    }

    if (sortBy === "appointments_high") {
      sorted.sort((a, b) => {
        const byAppointments = b.totalAppointments - a.totalAppointments;
        if (byAppointments !== 0) return byAppointments;
        return a.name.localeCompare(b.name);
      });
      return sorted;
    }

    sorted.sort((a, b) => {
      if (b.lastVisitTs !== a.lastVisitTs) return b.lastVisitTs - a.lastVisitTs;
      return a.name.localeCompare(b.name);
    });
    return sorted;
  }, [patients, searchTerm, sortBy, doctorFilter]);

  return (
    <>
      <div className="bg-white">
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
                  placeholder="Search patient, doctor, phone"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || patients.length === 0}
              >
                {PATIENT_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>

              <select
                value={doctorFilter}
                onChange={(event) => setDoctorFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || patients.length === 0}
              >
                {doctorOptions.map((option) => (
                  <option key={option} value={option}>
                    {option === "all" ? "Filter: All doctors" : `Filter: ${option}`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={PATIENT_COLUMNS}
          data={visiblePatients}
          getRowKey={(patient) => patient.id}
          loading={loading}
          loadingText="Loading patients..."
          emptyText="No patients found."
          pagination
          pageSize={10}
          resetPageKey={`${searchTerm}|${doctorFilter}|${sortBy}`}
          renderRow={(patient) => (
            <tr className="hover:bg-slate-50/70">
              <td className="px-5 py-4 sm:px-6 lg:px-7">
                <div className="flex items-center gap-3">
                  <img
                    src={patient.image || guestUserImage}
                    alt={patient.name}
                    className="h-10 w-10 rounded-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = guestUserImage;
                    }}
                  />
                  <p className="font-semibold text-slate-900">{patient.name}</p>
                </div>
              </td>
              <td className="px-5 py-4 text-slate-700">{patient.email || "-"}</td>
              <td className="px-5 py-4 text-slate-700">{patient.phone || "-"}</td>
              <td className="px-5 py-4 text-slate-600">{formatShortDate(patient.lastVisitDate)}</td>
              <td className="px-5 py-4 text-slate-700">{patient.lastDoctorName || "-"}</td>
              <td className="px-5 py-4 text-slate-700 sm:px-6 lg:px-7">{patient.totalAppointments}</td>
            </tr>
          )}
        />
      </div>
    </>
  );
};

export default Patients;
