import React, { useEffect, useState } from 'react';
import RescheduleModal from '../../components/user/RescheduleModal.jsx';
import AppointmentCard from '../../components/appointment/patient/AppointmentCard.jsx';
import AppointmentDetail from '../../components/appointment/patient/AppointmentDetail.jsx';
import TabBar from '../../components/ui/TabBar.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth';
import { createSocket } from '../../lib/socket';


const sortTs = (a) => {
  const d = new Date(`${(a.appointment_date || '').split('T')[0]}T${a.appointment_time || '00:00:00'}`);
  return isNaN(d) ? 0 : d.getTime();
};


const ITEMS_PER_PAGE = 4;

const ProfileAppointments = () => {
  const { accessToken } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending');
  const [sortMode, setSortMode] = useState('date_desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [selectedCallStatus, setSelectedCallStatus] = useState("waiting");

  const fetchAppointments = async () => {
    try {
      setError('');
      const { data } = await api.get('/appointments');
      setAppointments(data.appointments || []);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load appointments.');
    } finally {
      setLoading(false);
    }
  };


  // Fetching appointments on first load.
  useEffect(() => {
    fetchAppointments();
  }, []);

  const selected = appointments.find(a => a.appointment_id === selectedId) || null;

  useEffect(() => {
    if (!accessToken || !selected || !((selected.appointment_type).toLowerCase() === 'online') || selected.appointment_status !== 'scheduled') return undefined;

    const apptId = Number(selected.appointment_id);
    if (!Number.isInteger(apptId)) return undefined;

    let isActive = true;
    const socket = createSocket();


    const loadRoom = async () => {
      try {
        const { data } = await api.get(`/video-call/room/${apptId}`);
        console.log('Fetched room data:', data);
        setSelectedCallStatus(data?.call_status);
      } catch (error) {
        console.error('Failed to load video call room:', error);
      }
    };

    const joinAppointmentRoom = () => {
      socket.emit('join-appointment-room', { appointmentId: apptId, token: accessToken });
    };

    loadRoom();

    socket.on('connect', () => {
      joinAppointmentRoom();
    });
    if (socket.connected) joinAppointmentRoom();

    socket.on('appointment-call-status', (payload = {}) => {
      const status = String(payload?.call_status || 'waiting').toLowerCase();
      setSelectedCallStatus(status);
    });

    return () => {
      isActive = false;
      socket.disconnect();
    };
  }, [selectedId, accessToken, selected?.appointment_status, selected?.appointment_type, selected?.mode]);

  const handleCancel = async (appointmentId) => {
    setCancelLoading(true);
    try {
      await api.put(`/appointments/${appointmentId}/cancel`);
      setSelectedId(null);
      await fetchAppointments();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to cancel appointment.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRecordsAttached = async (appointmentId) => {
    await fetchAppointments();
    setSelectedId(appointmentId);
  };

  const pending = appointments.filter(a => a.appointment_status === 'scheduled');
  const completed = appointments.filter(a => a.appointment_status === 'completed');
  const cancelled = appointments.filter(a => a.appointment_status === 'cancelled');
  const visible = activeTab === 'pending' ? pending : activeTab === 'completed' ? completed : cancelled;

  const sorted = [...visible].sort((a, b) => {
    if (sortMode === 'date_desc') return sortTs(b) - sortTs(a);
    if (sortMode === 'name_asc') return (a.doctor_name || '').localeCompare(b.doctor_name || '');
    if (sortMode === 'name_desc') return (b.doctor_name || '').localeCompare(a.doctor_name || '');
    return sortTs(a) - sortTs(b);
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  return (
    <>
      <div className="flex items-stretch gap-5">

        <aside className={`space-y-4 self-stretch ${selected ? 'w-[420px] shrink-0 border-r border-slate-200 pr-4' : 'w-full'}`}>

          <div className="flex items-center justify-between gap-2">
            <TabBar
              tabs={[
                { value: "pending", label: `Pending (${pending.length})` },
                { value: "completed", label: `Completed (${completed.length})` },
                { value: "cancelled", label: `Cancelled (${cancelled.length})` },
              ]}
              value={activeTab}
              onChange={(tab) => {
                setActiveTab(tab);
                setSelectedId(null);
                setCurrentPage(1);
              }}
            />
            <select
              value={sortMode}
              onChange={e => { setSortMode(e.target.value); setCurrentPage(1); }}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none"
            >
              <option value="date_asc">Date: Oldest</option>
              <option value="date_desc">Date: Newest</option>
              <option value="name_asc">Doctor: A-Z</option>
              <option value="name_desc">Doctor: Z-A</option>
            </select>
          </div>

          <div className="space-y-2">
            {loading ? (
              <p className="text-sm text-slate-500">Loading appointments...</p>
            ) : error ? (
              <p className="text-sm text-rose-500">{error}</p>
            ) : paginated.length > 0 ? (
              paginated.map(apt => (
                <AppointmentCard
                  key={apt.appointment_id}
                  apt={apt}
                  isSelected={selected?.appointment_id === apt.appointment_id}
                  onClick={() => setSelectedId(prev => prev === apt.appointment_id ? null : apt.appointment_id)}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">No appointments found.</p>
            )}
          </div>

          {totalPages > 1 && (
            <Pagination
              className="pt-1"
              page={safePage}
              totalPages={totalPages}
              totalItems={sorted.length}
              pageSize={ITEMS_PER_PAGE}
              itemLabel="appointments"
              onPageChange={setCurrentPage}
              showSummary={!selected}
              compact
            />
          )}
        </aside>

        {selected && (
          <AppointmentDetail
            selected={selected}
            setSelectedId={setSelectedId}
            setRescheduleTarget={setRescheduleTarget}
            handleCancel={handleCancel}
            cancelLoading={cancelLoading}
            callStatus={selectedCallStatus}
            onRecordsAttached={handleRecordsAttached}
          />
        )}
      </div>

      {rescheduleTarget && (
        <RescheduleModal
          appointment={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={() => {
            setRescheduleTarget(null);
            setSelectedId(null);
            fetchAppointments();
          }}
        />
      )}

    </>
  );
};

export default ProfileAppointments;
