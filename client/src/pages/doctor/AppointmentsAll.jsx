import React, { useEffect, useMemo, useState } from "react";
import AppointmentCard from "../../components/appointment/doctor/AppointmentCard.jsx";
import AppointmentDetail from "../../components/appointment/doctor/AppointmentDetail.jsx";
import TabBar from "../../components/ui/TabBar.jsx";
import RescheduleModal from "../../components/user/RescheduleModal.jsx";
import api from "../../api/axios";
import { getSafeErrorMessage } from "../../utils/errorMessages";

const normalizeStatus = (status) => String(status || "pending").trim().toLowerCase();

const AppointmentsAll = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [activeTab, setActiveTab] = useState("scheduled");
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setActionError("");
      const { data } = await api.get("/appointments");
      setAppointments(Array.isArray(data?.appointments) ? data.appointments : []);
    } catch (error) {
      setAppointments([]);
      setActionError(getSafeErrorMessage(error, "Failed to load appointments."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const filteredAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const status = normalizeStatus(item.appointment_status);
      if (activeTab === "scheduled" && status !== "scheduled" && status !== "pending") return false;
      if (activeTab === "completed" && status !== "completed") return false;
      if (activeTab === "cancelled" && status !== "cancelled") return false;
      return true;
    });
  }, [appointments, activeTab]);

  const summary = useMemo(() => {
    return {
      pending: appointments.filter((item) => {
        const status = normalizeStatus(item.appointment_status);
        return status === "scheduled" || status === "pending";
      }).length,
      completed: appointments.filter((item) => normalizeStatus(item.appointment_status) === "completed").length,
      cancelled: appointments.filter((item) => normalizeStatus(item.appointment_status) === "cancelled").length,
    };
  }, [appointments]);

  const selectedAppointment =
    filteredAppointments.find((item) => Number(item.appointment_id) === Number(selectedAppointmentId)) || null;

  const cancelAppointment = async (appointmentId) => {
    try {
      setCancelLoading(true);
      setActionError("");
      await api.put(`/appointments/${appointmentId}/cancel`);
      setSelectedAppointmentId(null);
      setAppointments((prev) =>
        prev.map((item) =>
          Number(item.appointment_id) === Number(appointmentId)
            ? { ...item, appointment_status: "cancelled" }
            : item
        )
      );
    } catch (error) {
      setActionError(getSafeErrorMessage(error, "Failed to cancel appointment."));
    } finally {
      setCancelLoading(false);
    }
  };

  const completeAppointment = async (appointmentId, remarks = "") => {
    try {
      setCompleteLoading(true);
      setActionError("");
      const doctorNotes = remarks.trim();
      await api.put(`/appointments/${appointmentId}/complete`, { remarks: doctorNotes || null });
      setAppointments((prev) =>
        prev.map((item) =>
          Number(item.appointment_id) === Number(appointmentId)
            ? {
                ...item,
                appointment_status: "completed",
                doctor_notes: doctorNotes || item.doctor_notes,
                appointment_notes: doctorNotes || item.appointment_notes,
              }
            : item
        )
      );
      setActiveTab("completed");
    } catch (error) {
      setActionError(getSafeErrorMessage(error, "Failed to complete appointment."));
    } finally {
      setCompleteLoading(false);
    }
  };

  return (
    <>
      {actionError ? (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      <div className="space-y-6">
        <TabBar
          tabs={[
            { value: "scheduled", label: `Scheduled (${summary.pending})` },
            { value: "completed", label: `Completed (${summary.completed})` },
            { value: "cancelled", label: `Cancelled (${summary.cancelled})` },
          ]}
          value={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setSelectedAppointmentId(null);
          }}
        />

        <div className="flex items-stretch gap-5">
          <aside className={`space-y-4 self-stretch ${selectedAppointment ? "w-[420px] shrink-0 border-r border-slate-200 pr-4" : "w-full"}`}>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Loading appointments...</p>
              ) : filteredAppointments.length > 0 ? (
                filteredAppointments.map((item) => (
                  <AppointmentCard
                    key={item.appointment_id}
                    apt={item}
                    isSelected={Number(selectedAppointmentId) === Number(item.appointment_id)}
                    onClick={() =>
                      setSelectedAppointmentId((current) =>
                        Number(current) === Number(item.appointment_id) ? null : item.appointment_id
                      )
                    }
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                  No appointments found.
                </div>
              )}
            </div>
          </aside>

          {selectedAppointment ? (
            <AppointmentDetail
              selected={selectedAppointment}
              setSelectedId={setSelectedAppointmentId}
              onReschedule={setRescheduleTarget}
              onCancel={cancelAppointment}
              cancelLoading={cancelLoading}
              onComplete={completeAppointment}
              completeLoading={completeLoading}
            />
          ) : null}
        </div>
      </div>

      {rescheduleTarget ? (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={async () => {
            setRescheduleTarget(null);
            setSelectedAppointmentId(null);
            await loadAppointments();
          }}
        />
      ) : null}
    </>
  );
};

export default AppointmentsAll;
