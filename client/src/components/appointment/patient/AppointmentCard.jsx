import React from 'react';
import { CalendarDays, Clock3 } from 'lucide-react';
import { formatShortDate, formatTime } from '../../../utils/dateTime';

const AppointmentCard = ({ apt, isSelected, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl p-3 text-left transition ${
        isSelected ? 'bg-emerald-50 ring-1 ring-emerald-200' : 'bg-white ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      <p className="text-sm font-semibold text-slate-900 leading-snug">
        {apt.doctor_name || 'Doctor'}
        {apt.specialization_name && (
          <span className="font-normal text-slate-400"> ({apt.specialization_name})</span>
        )}
      </p>
      <p className="mt-1 text-xs text-slate-500 truncate">
        {apt.hospital_name || '-'} · <span className="capitalize">{apt.appointment_type || 'physical'}</span>
      </p>
      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
        <span>{formatShortDate(apt.appointment_date)}</span>
        <span className="text-slate-300">·</span>
        <Clock3 className="h-3.5 w-3.5 shrink-0" />
        <span>{formatTime(apt.appointment_time, '-')}</span>
      </div>
    </button>
  );
};

export default AppointmentCard;
