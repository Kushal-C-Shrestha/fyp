import React, { useEffect, useState } from 'react';
import { CalendarDays, X } from 'lucide-react';
import api from '../../api/axios';
import { formatShortDate, formatTime } from '../../utils/dateTime.js';


const RescheduleModal = ({ appointment, onClose, onSuccess }) => {
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [hospitalKey, setHospitalKey] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingSlots(true);
      setError('');
      try {
        const rawDate = (appointment.appointment_date || '').split('T')[0];
        const [docRes, slotRes] = await Promise.all([
          api.get(`/doctors/${appointment.doctor_id}`),
          api.get(`/doctors/${appointment.doctor_id}/availability`),
        ]);
        if (!active) return;


        setSlots(slotRes.data.slots);
        if (slotRes.data.slots.length > 0) setHospitalKey(slotRes.data.slots[0].hospitalKey);
      } catch {
        if (active) setError('Failed to load available slots.');
      } finally {
        if (active) setLoadingSlots(false);
      }
    })();

    return () => { active = false; };
  }, [appointment]);

  const handleConfirm = async () => {
    if (!selectedSlot) { setError('Please select a new time slot.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.put(`/appointments/${appointment.appointment_id}/reschedule`, {
        newHospitalId: selectedSlot.hospitalId,
        newAppointmentDate: selectedSlot.date,
        newAppointmentTime: selectedSlot.start_time,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to reschedule appointment.');
    } finally {
      setLoading(false);
    }
  };

  const activeHospital = slots.find(h => h.hospitalKey === hospitalKey) || slots[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center">
      <div className="flex w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-xl sm:rounded-2xl" style={{ maxHeight: '90vh' }}>

        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 shrink-0">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Reschedule Appointment</h3>
            <p className="mt-0.5 text-sm text-slate-500">Select a new slot with {appointment.doctor_name}</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 px-5 pt-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-2.5 text-sm">
            <CalendarDays className="h-4 w-4 shrink-0 text-amber-600" />
            <span className="font-medium text-amber-700">
              {formatShortDate(appointment.appointment_date)} · {formatTime(appointment.appointment_time)}
            </span>
            <span className="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-600">Current</span>
          </div>
        </div>

        {loadingSlots ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <div className="text-center">
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
              <p className="text-sm text-slate-500">Loading slots…</p>
            </div>
          </div>
        ) : error && slots.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-5 py-12">
            <p className="text-center text-sm text-rose-500">{error}</p>
          </div>
        ) : slots.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-12">
            <p className="text-sm text-slate-400">No available slots found for the next 2 weeks.</p>
          </div>
        ) : (
          <>
            {slots.length > 1 && (
              <div className="flex shrink-0 flex-wrap gap-2 px-5 pt-4">
                {slots.map(h => (
                  <button
                    key={h.hospitalKey}
                    type="button"
                    onClick={() => { setHospitalKey(h.hospitalKey); setSelectedSlot(null); }}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${hospitalKey === h.hospitalKey
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'
                      }`}
                  >
                    {h.hospitalName}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {activeHospital?.days.map(day => (
                <div key={day.date}>
                  <p className="mb-2 text-xs font-semibold text-slate-400">
                    {new Date(`${day.date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map(slot => {
                      const tl = formatTime(slot.start_time);
                      const isCur = slot.status === 'current';
                      const isBkd = slot.status === 'booked';
                      const isSel = selectedSlot?.slotKey === slot.slotKey;
                      return (
                        <button
                          key={slot.slotKey}
                          type="button"
                          disabled={isCur || isBkd}
                          onClick={() => setSelectedSlot({
                            slotKey: slot.slotKey,
                            hospitalId: activeHospital.hospitalId,
                            date: slot.date,
                            start_time: slot.start_time,
                            dayName: slot.dayName,
                            timeLabel: tl,
                          })}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${isCur ? 'cursor-not-allowed border-amber-200 bg-amber-50 text-amber-700'
                              : isBkd ? 'cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300'
                                : isSel ? 'border-blue-500 bg-blue-600 text-white'
                                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50'
                            }`}
                        >
                          {tl}
                          {isCur && <span className="ml-1 text-[9px] font-bold uppercase">Current</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && slots.length > 0 && (
          <p className="mx-5 shrink-0 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        <div className="flex shrink-0 items-center gap-3 border-t border-slate-100 px-5 py-4">
          {selectedSlot && (
            <p className="min-w-0 flex-1 truncate text-xs text-slate-600">
              <span className="font-semibold">New:</span> {selectedSlot.dayName}, {selectedSlot.date} · {selectedSlot.timeLabel}
            </p>
          )}
          <div className="ml-auto flex shrink-0 gap-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading || !selectedSlot}
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Rescheduling…' : 'Confirm Reschedule'}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RescheduleModal;
