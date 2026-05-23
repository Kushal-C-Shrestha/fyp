import React, { useEffect, useState } from 'react';
import { X, Clock4, Video, Loader2, FileText, Paperclip, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { formatShortDate, formatTime } from '../../utils/dateTime';
import { openProtectedFile } from '../../utils/fileAccess';
import { getSafeErrorMessage } from '../../utils/errorMessages';
import AppointmentChat from './AppointmentChat';

const isOnlineAppointment = (apt) => {
  const t = String(apt?.appointment_type || apt?.appointment_mode || apt?.mode || '').toLowerCase();
  return /(online|video|virtual|tele)/.test(t);
};

const callPopups = new Map();

const openPatientVideoCall = (apt) => {
  const appointmentId = apt?.appointment_id;
  if (!appointmentId) return;
  const existing = callPopups.get(appointmentId);
  if (existing && !existing.closed) {
    existing.focus();
    return;
  }
  const params = new URLSearchParams({
    participant: apt.doctor_name || 'Doctor',
    participantImage: apt.doctor_image || '',
  });
  const url = `/profile/appointments/video-call/${appointmentId}?${params.toString()}`;
  const popup = window.open(url, `patient-video-call-${appointmentId}`, 'popup=yes,width=1280,height=800,left=0,top=0');
  if (popup) {
    callPopups.set(appointmentId, popup);
    popup.focus();
  }
};

const AppointmentDetail = ({
  selected,
  setSelectedId,
  onReschedule,        // Doctor's callback
  setRescheduleTarget, // Patient's callback
  onCancel,            // Doctor's callback
  handleCancel,        // Patient's callback
  cancelLoading,
  onComplete,
  completeLoading,
  callStatus = 'waiting',
  onRecordsAttached,
  isDoctor = false,
  onStartCall,         // New: custom start call override
  extraActions,        // New: custom buttons in the action bar
  children,            // New: custom children rendered after metadata
}) => {
  const navigate = useNavigate();
  const [recordError, setRecordError] = useState('');
  const [attachOpen, setAttachOpen] = useState(false);
  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [selectedRecords, setSelectedRecords] = useState([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');

  useEffect(() => {
    setAttachOpen(false);
    setSelectedRecords([]);
    setRecordError('');
    setCompleteOpen(false);
    setCompletionNotes('');
  }, [selected?.appointment_id]);

  if (!selected) return null;

  const isPending =
    String(selected.appointment_status || '').toLowerCase() === 'scheduled' ||
    String(selected.appointment_status || '').toLowerCase() === 'pending';

  const isVideo = isOnlineAppointment(selected);
  const callActive = isVideo && (callStatus === 'call-started' || callStatus === 'ongoing');
  const callEnded = isVideo && callStatus === 'call-ended';

  const attachedRecordIds = new Set((selected.attached_records || []).map((record) => Number(record.record_id)));
  const availableRecords = records.filter((record) => !attachedRecordIds.has(Number(record.record_id)));

  const handleRescheduleClick = () => {
    if (typeof onReschedule === 'function') onReschedule(selected);
    if (typeof setRescheduleTarget === 'function') setRescheduleTarget(selected);
  };

  const handleCancelClick = () => {
    if (typeof onCancel === 'function') onCancel(selected.appointment_id);
    if (typeof handleCancel === 'function') handleCancel(selected.appointment_id);
  };

  const handleCompleteClick = () => {
    setCompleteOpen(true);
  };

  const submitCompletion = () => {
    if (typeof onComplete === 'function') {
      onComplete(selected.appointment_id, completionNotes.trim());
    }
  };

  const handleStartCall = () => {
    if (typeof onStartCall === 'function') {
      onStartCall();
    } else if (isDoctor) {
      navigate('/dashboard/doctor/video-calls');
    } else {
      openPatientVideoCall(selected);
    }
  };

  const toggleAttachPanel = async () => {
    setRecordError('');
    const nextOpen = !attachOpen;
    setAttachOpen(nextOpen);
    if (!nextOpen || records.length > 0) return;

    try {
      setRecordsLoading(true);
      const { data } = await api.get('/records');
      setRecords(Array.isArray(data?.records) ? data.records : []);
    } catch (err) {
      setRecordError(getSafeErrorMessage(err, 'Failed to load records.'));
    } finally {
      setRecordsLoading(false);
    }
  };

  const toggleRecord = (recordId) => {
    setSelectedRecords((prev) =>
      prev.includes(recordId)
        ? prev.filter((id) => id !== recordId)
        : [...prev, recordId]
    );
  };

  const attachRecords = async () => {
    if (selectedRecords.length === 0) return;
    try {
      setAttachLoading(true);
      setRecordError('');
      await api.post(`/appointments/${selected.appointment_id}/records`, { records: selectedRecords });
      setSelectedRecords([]);
      setAttachOpen(false);
      await onRecordsAttached?.(selected.appointment_id);
    } catch (err) {
      setRecordError(getSafeErrorMessage(err, 'Failed to attach records.'));
    } finally {
      setAttachLoading(false);
    }
  };

  return (
    <section className="min-w-0 flex-1 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Appointment Details</h3>
        <button
          type="button"
          onClick={() => setSelectedId(null)}
          className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {(isPending || extraActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {isPending && isVideo && (
            isDoctor ? (
              <button
                type="button"
                onClick={handleStartCall}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                Start Video Call
              </button>
            ) : callEnded ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-600 ring-1 ring-rose-200">
                Call Ended
              </span>
            ) : callActive ? (
              <button
                type="button"
                onClick={handleStartCall}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors"
              >
                <Video className="h-3.5 w-3.5" />
                Join Video Call
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Waiting for doctor to start the call...
              </span>
            )
          )}
          {isPending && (!isDoctor || typeof onReschedule === 'function' || typeof setRescheduleTarget === 'function') && (
            <button
              type="button"
              onClick={handleRescheduleClick}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Clock4 className="h-3.5 w-3.5" />
              Reschedule
            </button>
          )}
          {isPending && (!isDoctor || typeof onCancel === 'function' || typeof handleCancel === 'function') && (
            <button
              type="button"
              onClick={handleCancelClick}
              disabled={cancelLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-60"
            >
              <X className="h-3.5 w-3.5" />
              {cancelLoading ? 'Cancelling...' : 'Cancel'}
            </button>
          )}
          {isPending && isDoctor && typeof onComplete === 'function' && (
            <button
              type="button"
              onClick={handleCompleteClick}
              disabled={completeLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800 transition-colors disabled:opacity-60"
            >
              <Check className="h-3.5 w-3.5" />
              {completeLoading ? 'Completing...' : 'Add Notes & Complete'}
            </button>
          )}
          {isPending && !isDoctor && (
            <button
              type="button"
              onClick={toggleAttachPanel}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach Records
            </button>
          )}
          {extraActions}
        </div>
      )}

      <div className="space-y-3 text-sm text-slate-700">
        {isPending && isDoctor && typeof onComplete === 'function' && completeOpen && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-600" htmlFor={`completion-notes-${selected.appointment_id}`}>
              Completion Notes
            </label>
            <textarea
              id={`completion-notes-${selected.appointment_id}`}
              className="mt-2 min-h-[96px] w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-emerald-100"
              placeholder="Write diagnosis, advice, prescription notes, or follow-up details..."
              value={completionNotes}
              onChange={(event) => setCompletionNotes(event.target.value)}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={submitCompletion}
                disabled={completeLoading}
                className="rounded-xl bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {completeLoading ? 'Saving...' : 'Save and Complete'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCompleteOpen(false);
                  setCompletionNotes('');
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <p>
            <span className="font-semibold text-slate-900">Date:</span>{' '}
            {isDoctor ? formatShortDate(selected.appointment_date) : formatShortDate(selected.appointment_date)}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Time:</span>{' '}
            {formatTime(selected.appointment_time, '-')}
          </p>
        </div>
        {isDoctor ? (
          <p>
            <span className="font-semibold text-slate-900">Patient:</span>{' '}
            {selected.patient_name || '-'}
          </p>
        ) : (
          <>
            <p>
              <span className="font-semibold text-slate-900">Doctor:</span>{' '}
              {selected.doctor_name || '-'}
            </p>
            <p>
              <span className="font-semibold text-slate-900">Specialization:</span>{' '}
              {selected.specialization_name || 'General Medicine'}
            </p>
          </>
        )}
        <p>
          <span className="font-semibold text-slate-900">Hospital:</span>{' '}
          {selected.hospital_name || '-'}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Reason:</span>{' '}
          {selected.appointment_reason || '-'}
        </p>
        <p>
          <span className="font-semibold text-slate-900">Type:</span>{' '}
          <span className="capitalize">{selected.appointment_type || selected.appointment_mode || '-'}</span>
        </p>
        <p>
          <span className="font-semibold text-slate-900">Status:</span>{' '}
          <span className="capitalize">{selected.appointment_status || 'Scheduled'}</span>
        </p>
        {selected.doctor_notes && (
          <p>
            <span className="font-semibold text-slate-900">Doctor&apos;s Notes:</span>{' '}
            {selected.doctor_notes}
          </p>
        )}

        <div>
          <p className="font-semibold text-slate-900">Attached Records:</p>
          {selected.attached_records?.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {selected.attached_records.map(r => (
                <button
                  key={r.record_id}
                  type="button"
                  onClick={() => {
                    setRecordError('');
                    openProtectedFile(r.record_view_path, r.record_name)
                      .catch(err => setRecordError(getSafeErrorMessage(err, 'Failed to open record.')));
                  }}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 text-sm text-slate-700 transition"
                  title="View Record"
                >
                  <FileText className="h-4 w-4 text-slate-500" />
                  <span>{r.record_name || 'Medical Record'}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-slate-500 text-xs">No records attached.</p>
          )}
          {recordError && <p className="mt-2 text-xs font-semibold text-rose-600">{recordError}</p>}
        </div>

        {!isDoctor && selected.appointment_status === 'scheduled' && attachOpen && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            {recordsLoading ? (
              <p className="text-sm text-slate-500">Loading records...</p>
            ) : availableRecords.length > 0 ? (
              <>
                <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
                  {availableRecords.map((record) => {
                    const recordId = Number(record.record_id);
                    return (
                      <label
                        key={record.record_id}
                        className="flex cursor-pointer items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecords.includes(recordId)}
                          onChange={() => toggleRecord(recordId)}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span className="min-w-0 flex-1 truncate">{record.record_title || 'Medical Record'}</span>
                      </label>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={attachRecords}
                  disabled={attachLoading || selectedRecords.length === 0}
                  className="mt-3 inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {attachLoading ? 'Attaching...' : `Attach ${selectedRecords.length || ''}`.trim()}
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-500">No unattached records available.</p>
            )}
          </div>
        )}
      </div>

      {children}

      {isVideo && (
        <div className="mt-8 border-t border-slate-200 pt-6">
          <AppointmentChat
            appointmentId={selected.appointment_id}
            participantName={isDoctor ? selected.patient_name : selected.doctor_name}
            participantFallback={isDoctor ? 'Patient' : 'Doctor'}
            canSend={selected.appointment_status === 'scheduled' || selected.appointment_status === 'pending'}
            emptyMessage="No messages yet."
          />
        </div>
      )}
    </section>
  );
};

export default AppointmentDetail;
