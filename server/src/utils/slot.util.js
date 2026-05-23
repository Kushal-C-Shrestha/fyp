const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const toMins = (t) => {
  const [h, m] = (t || '0:0').split(':');
  return +h * 60 + +m;
};

export const fromMins = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}:00`;

export const generateDays = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return { dateStr: `${y}-${mo}-${da}`, dayName: DAYS[d.getDay()] };
  });
};

export const isBooked = (bookedAppointments, hospitalId, date, start_time) => {
  if (!bookedAppointments || !Array.isArray(bookedAppointments)) return false;
  return bookedAppointments.some((b) => {
    const status = String(b.status || b.appointment_status || '').trim().toLowerCase();
    if (status && !['scheduled', 'pending'].includes(status)) return false;
    if (String(b.hospital_id) !== String(hospitalId)) return false;

    let bDate = '';
    if (b.appointment_date instanceof Date) {
      const y = b.appointment_date.getFullYear();
      const mo = String(b.appointment_date.getMonth() + 1).padStart(2, '0');
      const da = String(b.appointment_date.getDate()).padStart(2, '0');
      bDate = `${y}-${mo}-${da}`;
    } else if (typeof b.appointment_date === 'string') {
      bDate = b.appointment_date.split('T')[0];
    }

    if (bDate !== date) return false;
    return (b.appointment_time || '').substring(0, 5) === (start_time || '').substring(0, 5);
  });
};



export const isOnLeave = (leaves, assignmentId, date, start_time) => {
  if (!leaves || !Array.isArray(leaves)) return false;
  return leaves.some((l) => {
    if (String(l.assignment_id) !== String(assignmentId)) return false;

    const start = (l.start_date || '').split(' ')[0];
    const end = (l.end_date || '').split(' ')[0];

    // If outside range, not on leave
    if (date < start || date > end) return false;

    // Full day leave covers everything in range
    if (l.leave_type === 'full_day') return true;

    // Partial day logic (hours)
    const slotMins = toMins(start_time);
    const leaveStartMins = toMins(l.start_time);
    const leaveEndMins = toMins(l.end_time);

    if (date === start && date === end) {
      return slotMins >= leaveStartMins && slotMins < leaveEndMins;
    }
    if (date === start) {
      return slotMins >= leaveStartMins;
    }
    if (date === end) {
      return slotMins < leaveEndMins;
    }

    return true; // Middle of multi-day leave
  });
};

export const expandToSlots = (schedule, dateStr, hospitalId, bookedAppointments, leaves) => {
  const { assignment_id, start_time, end_time, slot_interval_minutes, day_of_week } = schedule;
  const interval = parseInt(slot_interval_minutes, 10) || 30;
  const slots = [];

  for (let cur = toMins(start_time); cur + interval <= toMins(end_time); cur += interval) {
    const slotStart = fromMins(cur);
    const slotKey = `${hospitalId}_${dateStr}_${slotStart}`;

    const onLeave = isOnLeave(leaves, assignment_id, dateStr, slotStart);
    if (onLeave) continue; // Do not generate slots if on leave

    slots.push({
      slotKey,
      date: dateStr,
      dayName: day_of_week,
      start_time: slotStart,
      end_time: fromMins(cur + interval),
      assignment_id,
      status: isBooked(bookedAppointments, hospitalId, dateStr, slotStart)
          ? 'booked'
          : 'available',
    });
  }

  return slots;
};

export const generateSlots = (hospitals, bookedAppointments, leaves) => {
  const days = generateDays();
  return (hospitals || []).map((hospital) => ({
    hospitalKey: String(hospital.hospital_id),
    hospitalId: hospital.hospital_id,
    hospitalName: hospital.hospital_name,
    days: days.map((day) => ({
      ...day,
      date: day.dateStr,
      slots: (hospital.schedule || [])
          .filter((s) => s.day_of_week === day.dayName)
          .flatMap((s) =>
              expandToSlots(s, day.dateStr, hospital.hospital_id, bookedAppointments, leaves)
          ),
    })).filter((day) => day.slots.length > 0),
  }));
};
