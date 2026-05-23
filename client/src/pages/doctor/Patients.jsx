import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import guestUserImage from "../../assets/guest-user.svg";
import DataTable from "../../components/ui/DataTable";

const normalizeStatus = (status) => String(status || "pending").trim().toLowerCase();

const COLUMNS = [
  { label: "Patient" },
  { label: "Email" },
  { label: "Phone" },
  { label: "Last Visit" },
  { label: "Appointments" },
];

const getPatientKey = (appointment, index) => {
  const rawKey =
    appointment?.patient_id ||
    appointment?.patient_user_id ||
    appointment?.user_id ||
    appointment?.patient_email ||
    appointment?.patient_name;

  if (rawKey === null || rawKey === undefined || rawKey === "") {
    return `unknown-${index}`;
  }

  return String(rawKey);
};

const formatDisplayDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
};

const DoctorPatients = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAppointments = async () => {
      try {
        const { data } = await api.get("/appointments");
        setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
      } catch {
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, []);

  const patientMetrics = useMemo(() => {
    const byPatient = new Map();

    appointments.forEach((item, index) => {
      const key = getPatientKey(item, index);
      const status = normalizeStatus(item?.appointment_status);
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
        pendingAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0,
        lastVisitDate: "",
        lastVisitTs: 0,
      };

      current.totalAppointments += 1;
      if (status === "completed") current.completedAppointments += 1;
      else if (status === "cancelled") current.cancelledAppointments += 1;
      else current.pendingAppointments += 1;

      if (timestamp >= current.lastVisitTs) {
        current.lastVisitTs = timestamp;
        current.lastVisitDate = dateValue;
      }
      if ((current.name === "Patient" || !current.name) && item?.patient_name) {
        current.name = item.patient_name;
      }
      if ((current.email === "-" || !current.email) && item?.patient_email) {
        current.email = item.patient_email;
      }
      if ((current.phone === "-" || !current.phone) && item?.patient_phone) {
        current.phone = item.patient_phone;
      }
      if (!current.image && item?.patient_image) {
        current.image = item.patient_image;
      }

      byPatient.set(key, current);
    });

    const patients = Array.from(byPatient.values()).sort((a, b) => {
      if (b.lastVisitTs !== a.lastVisitTs) return b.lastVisitTs - a.lastVisitTs;
      return a.name.localeCompare(b.name);
    });

    const activePatients = patients.filter((patient) => patient.pendingAppointments > 0).length;

    return {
      patients,
      totalPatients: patients.length,
      activePatients,
      totalAppointments: appointments.length,
    };
  }, [appointments]);

  return (
    <>
      <div className="space-y-6">
        <DataTable
          columns={COLUMNS}
          data={patientMetrics.patients}
          getRowKey={(patient) => patient.id}
          loading={loading}
          loadingText="Loading patients..."
          emptyText="No patients found."
          pagination
          pageSize={10}
          renderRow={(patient) => (
                  <tr key={patient.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={patient.image || guestUserImage}
                          alt={patient.name}
                          className="h-9 w-9 rounded-full border border-slate-200 object-cover"
                          onError={(event) => {
                            event.currentTarget.src = guestUserImage;
                          }}
                        />
                        <p className="font-semibold text-slate-900">{patient.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{patient.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">{patient.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatDisplayDate(patient.lastVisitDate)}</td>
                    <td className="px-4 py-3 text-slate-700">{patient.totalAppointments}</td>
                  </tr>
          )}
        />
      </div>
    </>
  );
};

export default DoctorPatients;
