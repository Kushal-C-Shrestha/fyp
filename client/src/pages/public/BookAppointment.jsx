import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Building2,
  Calendar,
  ChevronLeft,
  MapPin,
  Star,
  Upload,
  User,
  Video,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import DoctorCard from '../../components/doctor/DoctorCard';
import WriteReviewModal from '../../components/WriteReviewModal';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Modal from '../../components/ui/Modal';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth.js';
import { formatTime } from '../../utils/dateTime.js';
import UserAvatar from '../../components/UserAvatar';


const BookAppointment = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { appointmentType: 'Physical', selectedSlotId: '', reason: '' }
  });

  const appointmentType = watch('appointmentType');
  const selectedSlotId = watch('selectedSlotId');

  const [doctor, setDoctor] = useState(null);
  const [hospitalSlots, setHospitalSlots] = useState([]);
  const [selectedHospitalKey, setSelectedHospitalKey] = useState('');
  const [selectedSlotDetails, setSelectedSlotDetails] = useState(null);
  const [similarDoctors, setSimilarDoctors] = useState([]);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [createdAppointmentId, setCreatedAppointmentId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRecords, setUserRecords] = useState([]);
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [isUploadingRecord, setIsUploadingRecord] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showOverlapModal, setShowOverlapModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('Something went wrong');
  const [pendingBookingData, setPendingBookingData] = useState(null);
  const recordFileInputRef = useRef(null);

  const fetchUserRecords = useCallback(async () => {
    if (!user) return [];

    try {
      const { data } = await api.get('/records');
      const records = Array.isArray(data?.records) ? data.records : [];
      setUserRecords(records);
      return records;
    } catch (err) {
      console.error('Failed to fetch records:', err);
      return [];
    }
  }, [user]);

  useEffect(() => {
    const fetchDoctorData = async () => {
      let doctorData = location.state?.doctor || null;

      if (!doctorData) {
        try {
          const { data } = await api.get(`/doctors/${id}`);
          doctorData = data.doctor;
        } catch (err) {
          console.error('Failed to fetch doctor:', err);
          setIsLoading(false);
          return;
        }
      }

      setDoctor(doctorData);

      if (location.state?.similarDoctors?.length > 0) {
        setSimilarDoctors(location.state.similarDoctors);
      } else if (doctorData?.specializations?.length > 0) {
        try {
          const specIds = doctorData.specializations.map((s) => s.specializationId);
          const { data: similar } = await api.get(
            `/doctors?specializationId=${specIds}&exclude=${doctorData.id || doctorData.doctor_id}`
          );
          setSimilarDoctors(similar.doctors || []);
        } catch (err) {
          console.error('Failed to fetch similar doctors:', err);
        }
      }

      const slotRes = await api.get(`/doctors/${doctorData.id}/availability`);
      setHospitalSlots(slotRes.data.slots);

      if (slotRes.data.slots.length > 0) {
        setSelectedHospitalKey(slotRes.data.slots[0].hospitalKey);
      }
      setIsLoading(false);
    };

    fetchDoctorData();
  }, [id]);

  useEffect(() => {
    fetchUserRecords();
  }, [fetchUserRecords]);
  console.log(doctor);


  const submitBooking = async (formData, confirmOverlap = false) => {
    setIsSubmitting(true);
    try {
      const { data } = await api.post('/appointments', {
        doctorId: doctor.id,
        hospitalId: selectedSlotDetails.hospitalId,
        appointmentDate: selectedSlotDetails.date,
        appointmentTime: selectedSlotDetails.start_time,
        appointmentType: formData.appointmentType.toLowerCase(),
        reasonForVisit: formData.reason,
        recordIds: selectedRecordIds,
        confirmOverlap,
      });
      setCreatedAppointmentId(data?.appointmentId || null);
      setBookingSuccess(true);
    } catch (err) {
      const code = err?.response?.data?.code;
      const msg = err?.response?.data?.message || 'Booking failed. Please try again.';
      if (code === 'PATIENT_OVERLAP') {
        setPendingBookingData(formData);
        setShowOverlapModal(true);
      } else {
        setErrorTitle(msg.toLowerCase().includes('appointment') ? 'Appointment Notice' : 'Something went wrong');
        setErrorMessage(msg);
        setShowErrorModal(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const onFormSubmit = async (formData) => {
    if (!selectedSlotDetails) {
      setErrorTitle('Select a time slot');
      setErrorMessage('Please select a time slot');
      setShowErrorModal(true);
      return;
    }
    await submitBooking(formData, false);
  };

  const onConfirmOverlap = async () => {
    setShowOverlapModal(false);
    if (pendingBookingData) await submitBooking(pendingBookingData, true);
    setPendingBookingData(null);
  };

  const getRecordTitleFromFile = (file) => {
    const name = String(file?.name || '').trim();
    return name.replace(/\.[^.]+$/, '') || 'Medical Record';
  };

  const uploadRecordFromBooking = async (file) => {
    if (!file) return;

    try {
      setIsUploadingRecord(true);
      setErrorTitle('Medical record upload');
      const payload = new FormData();
      payload.append('title', getRecordTitleFromFile(file));
      payload.append('medicalRecord', file);

      const { data } = await api.post('/records', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      const record = data?.record;
      if (!record?.record_id) {
        throw new Error('Failed to upload medical record.');
      }

      await fetchUserRecords();
      setSelectedRecordIds((prev) => (
        prev.includes(record.record_id) ? prev : [...prev, record.record_id]
      ));
    } catch (err) {
      setErrorTitle('Medical record upload');
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to upload medical record.');
      setShowErrorModal(true);
    } finally {
      setIsUploadingRecord(false);
      if (recordFileInputRef.current) recordFileInputRef.current.value = '';
    }
  };

  if (isLoading) return <div className="p-10 text-center">Loading...</div>;
  if (!doctor) return <div className="p-10 text-center">Doctor not found.</div>;

  const selectedHospital = hospitalSlots.find((h) => h.hospitalKey === selectedHospitalKey);

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mt-[74px] px-4 py-8 sm:px-6 lg:px-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-slate-500 hover:text-emerald-700">
          <ChevronLeft size={18} /> Back
        </button>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">

          {/* Left panel: Doctor info */}
          <div className="lg:col-span-5 space-y-6">

            {/* Doctor card */}
            <div className="flex gap-4 border-b border-slate-50 pb-6">
              <div className="h-24 w-24 overflow-hidden rounded-xl bg-slate-100 shrink-0">
                <UserAvatar src={doctor.profilePicture} name={doctor.name} className="h-full w-full object-cover" />
              </div>
              <div>
                {(doctor.specializations || []).length > 0 && (
                  <p className="text-sm font-semibold text-emerald-700">{doctor.specializations.map(s => s.specializationName).join(', ')}</p>
                )}
                <h2 className="text-2xl font-bold">{doctor.name || doctor.full_name || 'Doctor'}</h2>
                <div className="mt-2 space-y-1 text-sm text-slate-500">
                  {doctor.hospitals?.length > 0 && (
                    <div className="space-y-1">
                      {doctor.hospitals.map((h, i) => {
                        return (
                          <div key={h.hospital_id || i} className="flex items-start gap-2">
                            <Building2 size={14} className="mt-1 shrink-0" />
                            <p className="leading-relaxed">
                              <span className="font-medium text-slate-700">
                                {h.hospital_name}
                              </span>

                              {h.schedule?.[0]?.start_time && h.schedule?.[0]?.end_time
                                ? ` (${formatTime(h.schedule[0].start_time)} - ${formatTime(h.schedule[0].end_time)})`
                                : ''}

                              {i < doctor.hospitals.length - 1 ? ', ' : ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {doctor.avg_rating > 0 && (
                    <p className="flex items-center gap-1.5">
                      <Star size={14} className="text-amber-400" fill="currentColor" />
                      <span className="font-semibold text-slate-700">{doctor.avg_rating}</span>
                      {doctor.review_count > 0 && <span className="text-slate-400">({doctor.review_count} reviews)</span>}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Description */}
            {doctor.description && (
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">About</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{doctor.description}</p>
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">
                  Patient Reviews
                  {doctor.avg_rating > 0 && (
                    <span className="ml-2 inline-flex items-center gap-1 text-amber-500 text-sm font-medium">
                      <Star size={13} fill="currentColor" /> {doctor.avg_rating}
                      <span className="text-slate-400 font-normal">({doctor.review_count})</span>
                    </span>
                  )}
                </h3>
                <span className="text-xs text-slate-500">{doctor.review_count || 0} reviews</span>
              </div>

              <div className="space-y-4">
                {(doctor.reviews || []).length > 0 ? doctor.reviews.map((r, idx) => (
                  <div key={r.review_id ?? idx} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                    <div className="mb-2 flex items-center gap-3">
                      {r.reviewer_picture ? (
                        <img src={r.reviewer_picture} alt={r.reviewer_name} className="h-9 w-9 rounded-full object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                          {(r.reviewer_name || 'P').charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-800">{r.reviewer_name}</p>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${star <= Number(r.rating || 0) ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'}`}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p
                      className="text-sm leading-6 text-slate-600"
                      style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                    >
                      {r.comment || 'No written comment.'}
                    </p>
                  </div>
                )) : (
                  <p className="text-sm text-slate-500">No reviews yet.</p>
                )}
              </div>

              <div className="mt-5 flex divide-x divide-slate-200 border-t border-slate-100 pt-4 text-sm">
                <button
                  type="button"
                  onClick={() => navigate(`/doctors/${doctor.id || doctor.doctor_id}/reviews`, { state: { doctor } })}
                  className="flex-1 text-center font-medium text-slate-600 hover:text-emerald-700 transition pr-4"
                >
                  See all reviews
                </button>
                <button
                  type="button"
                  onClick={() => user ? setShowReviewModal(true) : navigate('/login')}
                  className="flex-1 text-center font-medium text-emerald-700 hover:text-emerald-800 transition pl-4"
                >
                  Write a review
                </button>
              </div>

            </div>
          </div>

          {/* Right panel: Booking form  */}
          <div className="lg:col-span-7 lg:border-l border-slate-50 lg:pl-10 pb-10">
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-8">

              {/* Appointment Type */}
              <div>
                <h3 className="font-semibold text-slate-900">Appointment Type</h3>
                <div className="mt-3 flex gap-3">
                  {['Physical', 'Online'].map(type => {
                    const active = appointmentType === type;
                    return (
                      <button key={type} type="button" onClick={() => setValue('appointmentType', type)}
                        className={`flex-1 flex items-center justify-center gap-2 rounded-xl border-2 px-4 py-2.5 text-sm font-semibold transition-all duration-200
                          ${active
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-100 text-slate-400 bg-white hover:border-emerald-200 hover:text-emerald-700'}`}>
                        {type === 'Physical' ? <Building2 size={16} /> : <Video size={16} />}
                        {type === 'Physical' ? 'In-Clinic' : 'Online'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Select Hospital */}
              <div>
                <h3 className="font-semibold text-slate-900">Select Hospital</h3>

                {hospitalSlots.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-400">No available slots found for this doctor.</p>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {hospitalSlots.map(h => {
                      const active = selectedHospitalKey === h.hospitalKey;
                      return (
                        <button key={h.hospitalKey} type="button"
                          onClick={() => {
                            setSelectedHospitalKey(h.hospitalKey);
                            setSelectedSlotDetails(null);
                            setValue('selectedSlotId', '');
                          }}
                          className={`rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200
                            ${active
                              ? 'bg-emerald-600 border-emerald-600 text-white'
                              : 'bg-white border-slate-100 text-slate-500 hover:border-emerald-200 hover:text-emerald-700'}`}>
                          {h.hospitalName}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Select Time */}
              {selectedHospital && (
                <div>
                  <h3 className="font-semibold text-slate-900">Select Time</h3>

                  {selectedHospital.days.length === 0 ? (
                    <p className="mt-3 text-sm text-slate-400">No slots available for this hospital in the next 2 weeks.</p>
                  ) : (
                    <div className="mt-3 space-y-5">
                      {selectedHospital.days.map(d => {
                        // Format date correctly
                        const dateObj = new Date(d.date + 'T00:00:00');
                        const dateLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
                        return (
                          <div key={d.date}>
                            <p className="text-sm font-bold text-slate-900 mb-2">{dateLabel}</p>
                            <div className="flex flex-wrap gap-2">
                              {d.slots.map(s => {
                                const validTimeStr = s.start_time.length === 5 ? `${s.start_time}:00` : s.start_time;
                                const isPast = new Date(`${d.date}T${validTimeStr}`) < new Date();
                                const booked = s.status !== 'available' || isPast;
                                const timeLabel = formatTime(s.start_time);
                                const isSelected = selectedSlotId === s.slotKey;
                                return (
                                  <button
                                    key={s.slotKey}
                                    type="button"
                                    disabled={booked}
                                    title={isPast ? "This time has already passed" : (s.status !== 'available' ? "Slot already booked" : "Available")}
                                    onClick={() => {
                                      setValue('selectedSlotId', s.slotKey);
                                      setSelectedSlotDetails({
                                        hospital: selectedHospital.hospitalName,
                                        hospitalId: selectedHospital.hospitalId,
                                        day: d.dayName,
                                        date: d.date,
                                        start_time: s.start_time,
                                        end_time: s.end_time,
                                        timeLabel,
                                      });
                                    }}
                                    className={`rounded-lg border px-4 py-2 text-xs font-medium transition
                                      ${booked
                                        ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed opacity-60'
                                        : isSelected
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-100'
                                          : 'bg-white border-slate-100 text-slate-600 hover:border-emerald-300 hover:text-emerald-700 hover:bg-emerald-50'}`}
                                  >
                                    {timeLabel}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Reason for visit */}
              <div>
                <h3 className="font-semibold text-slate-900">Reason for Visit</h3>
                <textarea
                  rows={3}
                  {...register('reason', {
                    required: 'Reason is required',
                    minLength: { value: 8, message: 'Minimum 8 characters required' }
                  })}
                  className={`mt-3 w-full rounded-xl border p-3 text-sm outline-none transition focus:border-emerald-500 ${errors.reason ? 'border-red-300 bg-red-50' : 'border-slate-200'}`}
                  placeholder="Describe your concern here..."
                />
                <div className="flex justify-between items-center mt-1">
                  {errors.reason
                    ? <p className="text-[10px] text-red-500">{errors.reason.message}</p>
                    : <p className="text-[10px] text-slate-400">Describe your concern (min 8 chars)</p>}
                  <p className="text-[10px] text-slate-400">{(watch('reason') || '').length}/500</p>
                </div>
              </div>

              {/* Medical Records */}
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Attach Medical Records</h3>
                <p className="text-xs text-slate-500 mb-3">Share your medical history with the doctor.</p>
                <input
                  ref={recordFileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(event) => uploadRecordFromBooking(event.target.files?.[0] || null)}
                />
                {userRecords.length > 0 ? (
                  <div className="space-y-3">
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {userRecords.map(record => (
                        <label key={record.record_id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50 hover:border-emerald-200 cursor-pointer transition-all">
                          <input
                            type="checkbox"
                            checked={selectedRecordIds.includes(record.record_id)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-300 "
                            onChange={() => {
                              setSelectedRecordIds((prev) => {
                                if (prev.includes(record.record_id)) {
                                  return prev.filter(id => id !== record.record_id);
                                } else {
                                  return [...prev, record.record_id];
                                }
                              })
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{record.record_title}</p>
                            <p className="text-[10px] text-slate-400">{new Date(record.uploaded_at).toLocaleDateString()}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => recordFileInputRef.current?.click()}
                      disabled={isUploadingRecord}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      {isUploadingRecord ? 'Uploading...' : 'Upload another record'}
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center bg-slate-50/50">
                    <p className="text-sm text-slate-500 mb-2">No medical records found.</p>
                    <button
                      type="button"
                      onClick={() => recordFileInputRef.current?.click()}
                      disabled={isUploadingRecord}
                      className="text-xs font-semibold text-emerald-700 hover:underline"
                    >
                      {isUploadingRecord ? 'Uploading...' : 'Upload a PDF record'}
                    </button>
                  </div>
                )}
              </div>

              {/* Booking summary */}
              <div className="rounded-xl border border-slate-50 bg-slate-50/50 p-5">
                <h4 className="font-semibold text-sm mb-3 text-slate-700">Booking Summary</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>Doctor</span> <span className="font-medium">{doctor.name || doctor.full_name}</span></div>
                  <div className="flex justify-between"><span>Type</span>   <span className="font-medium">{appointmentType}</span></div>
                  {selectedSlotDetails && (<>
                    <div className="flex justify-between">
                      <span>Hospital</span>
                      <span className="font-medium">{selectedSlotDetails.hospital}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Slot</span>
                      <span>{selectedSlotDetails.day} ({selectedSlotDetails.date}), {selectedSlotDetails.timeLabel}</span>
                    </div>
                  </>)}
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedSlotDetails}
                  className="mt-6 w-full rounded-xl bg-emerald-700 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-sm"
                >
                  {isSubmitting ? 'Processing...' : 'Confirm Appointment'}
                </button>
              </div>

            </form>
          </div>
        </div>

        {/* Similar Specialists */}
        <section className="py-12 mt-4">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="text-xl font-bold text-slate-900">Similar Specialists</h2>
            <button
              onClick={() => navigate('/doctors')}
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              View More
            </button>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            {similarDoctors.length > 0 ? (
              similarDoctors.slice(0, 5).map((doc, idx) => (
                <DoctorCard key={idx} doctor={doc} className="shadow-none" showViewButton={false} showBookButton={false} />
              ))
            ) : (
              <p className="text-sm text-slate-500">No similar specialists found.</p>
            )}
          </div>
        </section>
      </main>

      <Footer />

      <Modal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorTitle}
        variant={errorTitle === 'Appointment Notice' || errorTitle === 'Select a time slot' ? 'warning' : 'error'}
        size="sm"
        zIndex="z-[60]"
      >
        <p className="text-sm leading-relaxed text-slate-600">{errorMessage}</p>
      </Modal>

      <ConfirmModal
        isOpen={showOverlapModal}
        onClose={() => { setShowOverlapModal(false); setPendingBookingData(null); }}
        onConfirm={onConfirmOverlap}
        title="Appointment Conflict"
        description="You already have another appointment at this time. Are you sure you want to book this one too?"
        cancelLabel="Cancel"
        confirmLabel="Book Anyway"
        variant="primary"
        loading={isSubmitting}
      />

      <Modal
        isOpen={bookingSuccess}
        onClose={() => navigate('/profile/appointments')}
        title="Appointment booked"
        variant="success"
        size="sm"
        footer={
          <button
            type="button"
            onClick={() => navigate('/profile/appointments')}
            className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            View My Appointments
          </button>
        }
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Your appointment has been confirmed{createdAppointmentId ? ` as #${createdAppointmentId}` : ''}. You can view it in My Appointments.
        </p>
      </Modal>

      {showReviewModal && (
        <WriteReviewModal
          doctorId={doctor.id || doctor.doctor_id}
          doctorName={doctor.name || doctor.full_name}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => setShowReviewModal(false)}
        />
      )}
    </div>
  );
};

export default BookAppointment;
