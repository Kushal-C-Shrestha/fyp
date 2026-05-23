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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900 leading-snug">
          {apt.patient_name || 'Patient'}
        </p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
          {apt.appointment_status || 'Scheduled'}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-500 truncate">
        {apt.appointment_reason || '-'}
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
