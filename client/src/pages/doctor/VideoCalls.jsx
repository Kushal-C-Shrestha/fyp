import React, { useEffect, useMemo, useRef, useState } from "react";
import TabBar from "../../components/ui/TabBar.jsx";
import AppointmentCard from "../../components/appointment/doctor/AppointmentCard.jsx";
import AppointmentDetail from "../../components/appointment/doctor/AppointmentDetail.jsx";
import api from "../../api/axios";
import { getSafeErrorMessage } from "../../utils/errorMessages";

const normalizeStatus = (status) => String(status || "pending").trim().toLowerCase();

const normalizeCallStatus = (status) => {
  const normalized = String(status || "waiting").trim().toLowerCase();
  if (normalized === "ongoing" || normalized === "call-started") return "ongoing";
  if (normalized === "ended" || normalized === "call-ended") return "ended";
  return "waiting";
};

const getAppointmentMode = (appointment) => {
  const explicitMode = String(
    appointment?.appointment_type || appointment?.appointment_mode || appointment?.consultation_type || appointment?.mode || ""
  ).toLowerCase();

  if (/(online|virtual|video|tele)/.test(explicitMode)) return "online";
  if (/(physical|in[- ]?person|offline|clinic|hospital)/.test(explicitMode)) return "physical";

  const notes = String(appointment?.appointment_notes || appointment?.notes || "").toLowerCase();
  if (/consultation type:\s*online/.test(notes)) return "online";
  if (/consultation type:\s*(physical|in[- ]?person)/.test(notes)) return "physical";
  if (/\bonline\b/.test(notes)) return "online";
  if (/\b(physical|in[- ]?person)\b/.test(notes)) return "physical";

  return "physical";
};

const DoctorVideoCalls = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [activeVideoTab, setActiveVideoTab] = useState("pending");
  const [selectedVideoAppointmentId, setSelectedVideoAppointmentId] = useState(null);
  const [completingAppointmentId, setCompletingAppointmentId] = useState(null);
  const callPopupsRef = useRef({});

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setActionError("");
      const { data } = await api.get("/video-call/doctor/scheduled");
      setAppointments(Array.isArray(data?.calls) ? data.calls : []);
    } catch (error) {
      setAppointments([]);
      setActionError(getSafeErrorMessage(error, "Failed to load video calls."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const videoAppointments = useMemo(() => {
    return appointments.filter((item) => {
      const status = normalizeStatus(item.appointment_status);
      return getAppointmentMode(item) === "online" && ["scheduled", "pending", "completed"].includes(status);
    });
  }, [appointments]);

  const pendingVideoAppointments = useMemo(
    () => videoAppointments.filter((item) => normalizeStatus(item?.appointment_status) !== "completed"),
    [videoAppointments]
  );

  const completedVideoAppointments = useMemo(
    () => videoAppointments.filter((item) => normalizeStatus(item?.appointment_status) === "completed"),
    [videoAppointments]
  );

  const activeVideoAppointments = useMemo(
    () => (activeVideoTab === "completed" ? completedVideoAppointments : pendingVideoAppointments),
    [activeVideoTab, completedVideoAppointments, pendingVideoAppointments]
  );

  const selectedVideoAppointment = useMemo(() => {
    return (
      activeVideoAppointments.find(
        (item) => Number(item?.appointment_id) === Number(selectedVideoAppointmentId)
      ) || null
    );
  }, [activeVideoAppointments, selectedVideoAppointmentId]);

  useEffect(() => {
    setSelectedVideoAppointmentId((current) => {
      if (!current) return current;
      const exists = activeVideoAppointments.some(
        (item) => Number(item?.appointment_id) === Number(current)
      );
      return exists ? current : null;
    });
  }, [activeVideoAppointments]);

  const openCallChatPopup = (appointment) => {
    const appointmentId = Number(appointment?.appointment_id);
    if (!Number.isInteger(appointmentId)) return;

    const existingPopup = callPopupsRef.current[appointmentId];
    if (existingPopup && !existingPopup.closed) {
      existingPopup.focus();
      return;
    }

    const popupWidth = window.screen?.availWidth || window.innerWidth || 1400;
    const popupHeight = window.screen?.availHeight || window.innerHeight || 900;
    const popupParams = new URLSearchParams({
      patient: appointment?.patient_name || "Patient",
      patientImage: appointment?.patient_image || "",
    });
    const popupUrl = `/dashboard/doctor/video-calls/chat/${appointmentId}?${popupParams.toString()}`;
    const popupName = `doctor-video-chat-${appointmentId}`;
    const popupFeatures = `popup=yes,width=${popupWidth},height=${popupHeight},left=0,top=0,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes`;
    const popup = window.open(popupUrl, popupName, popupFeatures);

    if (popup) {
      callPopupsRef.current[appointmentId] = popup;
      try {
        popup.moveTo(0, 0);
        popup.resizeTo(popupWidth, popupHeight);
      } catch {
        // no-op
      }
      popup.focus();
      return;
    }

    setActionError("Popup blocked. Allow popups for this site to open chat in a new window.");
  };

  const startSelectedVideoCall = async () => {
    if (!selectedVideoAppointment) return;

    const appointmentId = Number(selectedVideoAppointment.appointment_id);
    if (!Number.isInteger(appointmentId)) return;

    const appointmentStatus = normalizeStatus(selectedVideoAppointment.appointment_status);
    if (appointmentStatus === "completed" || appointmentStatus === "cancelled") {
      setActionError("Cannot start call for completed/cancelled appointment.");
      return;
    }
    if (normalizeCallStatus(selectedVideoAppointment.call_status) === "ongoing") {
      openCallChatPopup(selectedVideoAppointment);
      return;
    }

    setActionError("");

    try {
      const { data } = await api.post(`/video-call/start/${appointmentId}`);
      const updatedStatus = normalizeCallStatus(data?.call_status);
      const updatedRoomId = data?.room_id || null;

      setAppointments((prev) =>
        prev.map((item) =>
          Number(item.appointment_id) === appointmentId
            ? {
                ...item,
                call_status: updatedStatus,
                room_id: updatedRoomId || item.room_id || null,
              }
            : item
        )
      );
      openCallChatPopup(selectedVideoAppointment);
    } catch (error) {
      setActionError(getSafeErrorMessage(error, "Failed to start call."));
    }
  };

  const completeSelectedAppointment = async (appointmentId, remarks = "") => {
    appointmentId = Number(appointmentId);
    if (!Number.isInteger(appointmentId)) return;

    const targetAppointment = appointments.find((item) => Number(item.appointment_id) === appointmentId);
    const appointmentStatus = normalizeStatus(targetAppointment?.appointment_status);
    if (appointmentStatus === "completed" || appointmentStatus === "cancelled") return;

    setActionError("");
    setCompletingAppointmentId(appointmentId);

    try {
      const doctorNotes = remarks.trim();
      await api.put(`/appointments/${appointmentId}/complete`, {
        remarks: doctorNotes || null,
      });
      setAppointments((prev) =>
        prev.map((item) =>
          Number(item.appointment_id) === appointmentId
            ? {
                ...item,
                appointment_status: "Completed",
                call_status: normalizeCallStatus(item.call_status) === "ongoing" ? "ended" : item.call_status,
                doctor_notes: doctorNotes || item.doctor_notes,
                appointment_notes: doctorNotes || item.appointment_notes,
              }
            : item
        )
      );
      setActiveVideoTab("completed");
    } catch (error) {
      setActionError(getSafeErrorMessage(error, "Failed to complete appointment."));
    } finally {
      setCompletingAppointmentId(null);
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
            { value: "pending", label: `Pending (${pendingVideoAppointments.length})` },
            { value: "completed", label: `Completed (${completedVideoAppointments.length})` },
          ]}
          value={activeVideoTab}
          onChange={(tab) => {
            setActiveVideoTab(tab);
            setSelectedVideoAppointmentId(null);
          }}
        />

        <div className="flex items-stretch gap-5">
          <aside className={`space-y-4 self-stretch ${selectedVideoAppointment ? "w-[420px] shrink-0 border-r border-slate-200 pr-4" : "w-full"}`}>
            <div className="space-y-2">
              {loading ? (
                <p className="text-sm text-slate-500">Loading appointments...</p>
              ) : activeVideoAppointments.length > 0 ? (
                activeVideoAppointments.map((item) => (
                  <AppointmentCard
                    key={item.appointment_id}
                    apt={item}
                    isSelected={Number(selectedVideoAppointmentId) === Number(item.appointment_id)}
                    onClick={() =>
                      setSelectedVideoAppointmentId((current) =>
                        Number(current) === Number(item.appointment_id) ? null : item.appointment_id
                      )
                    }
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                  No video appointments found.
                </div>
              )}
            </div>
          </aside>

          {selectedVideoAppointment ? (
            <AppointmentDetail
              selected={selectedVideoAppointment}
              setSelectedId={setSelectedVideoAppointmentId}
              onStartCall={startSelectedVideoCall}
              onComplete={completeSelectedAppointment}
              completeLoading={completingAppointmentId === Number(selectedVideoAppointment.appointment_id)}
            />
          ) : null}
        </div>
      </div>
    </>
  );
};

export default DoctorVideoCalls;
