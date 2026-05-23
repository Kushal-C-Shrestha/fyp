import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  BriefcaseBusiness,
  Building2,
  Calendar,
  Clock3,
  FileText,
  GraduationCap,
  MapPin,
  Star,
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import DoctorCard from '../../components/doctor/DoctorCard';
import WriteReviewModal from '../../components/WriteReviewModal';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth.js';
import UserAvatar from '../../components/UserAvatar';
import { formatTime } from '../../utils/dateTime.js';

const DoctorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [similarDoctors, setSimilarDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const getDoctorDetails = async (showLoading = true) => {
    try {
      if (showLoading && !doctor) setLoading(true);
      const { data } = await api.get(`/doctors/${id}`);
      if (!data.doctor) {
        setDoctor(null);
        return;
      }
      setDoctor(data.doctor);
      if (data.doctor.specializations.length > 0) {
        const specializations = data.doctor.specializations.map(s => s.specializationId);
        const { data: similar } = await api.get(`/doctors?specializationId=${specializations}&exclude=${data.doctor.id}`);
        setSimilarDoctors(similar.doctors || []);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getDoctorDetails();
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-grow mt-[74px] px-4 py-8 sm:px-6 lg:px-10 flex items-center justify-center">
          <p className="text-lg text-slate-500 font-medium">Loading details...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="min-h-screen flex flex-col bg-white">
        <Navbar />
        <main className="flex-grow mt-[74px] flex flex-col items-center justify-center p-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-4">
            <MapPin className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900">Doctor Not Found</h2>
          <p className="mt-2 text-slate-500 max-w-sm">We couldn't find the doctor profile you are looking for.</p>
          <button
            onClick={() => navigate('/doctors')}
            className="mt-6 rounded-lg bg-emerald-700 px-6 py-2.5 font-semibold text-white transition hover:bg-emerald-800"
          >
            Back to Doctors
          </button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main className="mt-[74px] px-4 py-6 sm:px-6 lg:px-10">
        <section className="grid grid-cols-1 gap-8 pb-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ── Left column ── */}
          <div>
            {/* Header */}
            <div className="pb-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="h-44 w-full overflow-hidden rounded-2xl sm:h-48 sm:w-48 shrink-0 flex items-center justify-center">
                  <UserAvatar src={doctor.profile_picture} name={doctor.name} size="h-full w-full" className="rounded-none border-none ring-0" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2">
                    {doctor.specializations?.length > 0 && (
                      <p className="text-sm font-semibold text-emerald-700">
                        {doctor.specializations.map((specialization) => specialization.specializationName).join(', ')}
                      </p>
                    )}
                  </div>
                  <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-[28px]">{doctor.name}</h1>
                  <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2 text-sm text-slate-600 sm:grid-cols-2">
                    <p className="inline-flex items-center gap-1.5 truncate">
                      <MapPin className="h-4 w-4 shrink-0 text-slate-500" />
                      <span className="truncate">{doctor.address || 'Address not specified'}</span>
                    </p>
                    <p className="inline-flex items-center gap-1.5 truncate">
                      <BriefcaseBusiness className="h-4 w-4 shrink-0 text-slate-500" />
                      <span>{doctor.experience ? `${doctor.experience} yrs exp` : 'No exp'}</span>
                    </p>
                  </div>
                  <div className="mt-3 text-sm text-slate-600">
                    Rating: <Star className="inline h-4 w-4 text-amber-500 mb-1" /> {doctor.avg_rating > 0 ? doctor.avg_rating.toFixed(1) : '0.0'} ({doctor.review_count || 0})
                  </div>
                </div>

                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:self-center shrink-0"
                  onClick={() =>
                    navigate(
                      user ? `/doctors/${doctor.id}/book-appointment` : '/login',
                      { state: { doctor, similarDoctors } }
                    )
                  }
                >
                  <Calendar className="h-4 w-4" />
                  Book Appointment
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="py-6">
              <hr className="mb-6 border-slate-200 mx-6" />
              <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <FileText className="h-4 w-4 text-emerald-700" />
                About Doctor
              </h2>
              <p className="text-sm leading-7 text-slate-600">{doctor.description}</p>
            </div>

            <div className="py-6">
              <hr className="mb-6 border-slate-200 mx-6" />
              <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <Clock3 className="h-4 w-4 text-emerald-700" />
                Hospital Schedules
              </h2>
              {doctor.hospitals?.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-12 gap-y-12 sm:grid-cols-2 sm:divide-x sm:divide-slate-100">
                  {doctor.hospitals.map((hospital, idx) => (
                    <article key={idx} className="relative sm:first:pr-6 sm:last:pl-12">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                          <Building2 className="h-4 w-4 text-emerald-700" />
                          {hospital.hospital_name}
                        </p>
                        <p className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          <MapPin className="h-3 w-3" />
                          {hospital.hospital_address || 'Address not listed'}
                        </p>
                      </div>
                      <p className="mt-2 text-sm font-medium text-emerald-700">Consultation Fee: Rs {Number(hospital.consultation_fee || 0).toLocaleString()}</p>
                      {hospital.schedule?.length > 0 ? (
                        <div className="space-y-1.5 mt-3">
                          {hospital.schedule.map((slot, slotIdx) => (
                            <div key={slotIdx} className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">{slot.day_of_week}</span>
                              <span className="font-medium text-slate-700">{formatTime(slot.start_time) || '-'} - {formatTime(slot.end_time) || '-'}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 mt-2 italic">No schedule configured yet.</p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Hospital schedules are not available right now.</p>
              )}
            </div>

            <div className="py-6">
              <hr className="mb-6 border-slate-200 mx-6" />
              <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <GraduationCap className="h-4 w-4 text-emerald-700" />
                Qualifications
              </h2>
              {doctor.qualifications.length > 0 ? (
                <ul className="space-y-1.5 text-sm text-slate-600 list-disc list-inside">
                  {doctor.qualifications.map((q, idx) => (
                    <li key={idx}>
                      <span className="font-medium text-slate-800">{q.degree}</span>
                      {q.institution ? ` from ${q.institution}` : ''}
                      {q.graduation_date ? ` (${q.graduation_date})` : ''}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-600">Not specified</p>
              )}
            </div>

            <div className="py-6">
              <hr className="mb-6 border-slate-200 mx-6" />
              <h2 className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BriefcaseBusiness className="h-4 w-4 text-emerald-700" />
                Work Experience
              </h2>
              {doctor.work_experience && doctor.work_experience.length > 0 ? (
                <div className="space-y-2">
                  {doctor.work_experience.map((work, idx) => (
                    <p key={idx} className="text-sm text-slate-600">
                      <span className="font-medium text-slate-800">{work.position}</span>
                      {' at '}
                      {work.organization}
                      {' ('}
                      {new Date(work.startDate).toISOString().split('T')[0] || '-'}
                      {' - '}
                      {work.endDate || 'Present'}
                      {')'}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-600">Not specified.</p>
              )}
            </div>
          </div>

          <aside className="h-fit py-1 lg:sticky lg:top-24">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Reviews</h2>
              <span className="text-xs text-slate-500">{doctor.review_count || 0} reviews</span>
            </div>

            <div className="space-y-4">
              {doctor.reviews.length > 0 ? doctor.reviews.map((review, idx) => (
                <div key={idx} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                  <div className="mb-2 flex items-center gap-3">
                    <UserAvatar src={review.reviewer_picture} name={review.reviewer_name} size="h-9 w-9" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{review.reviewer_name}</p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star, starIdx) => (
                          <Star
                            key={starIdx}
                            className={`h-3.5 w-3.5 ${starIdx < Number(review.rating || 0) ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p
                    className="text-sm leading-6 text-slate-600"
                    style={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {review.comment || 'No written comment.'}
                  </p>
                </div>
              )) : (
                <p className="text-sm text-slate-500">No reviews yet.</p>
              )}
            </div>

            <div className="mt-5 flex divide-x divide-slate-200 border-t border-slate-100 pt-4 text-sm">
              <button
                onClick={() => navigate(`/doctors/${doctor.id}/reviews`, { state: { doctor } })}
                className="flex-1 text-center font-medium text-slate-600 hover:text-emerald-700 transition pr-4"
              >
                See all reviews
              </button>
              <button
                onClick={() => user ? setShowReviewModal(true) : navigate('/login')}
                className="flex-1 text-center font-medium text-emerald-700 hover:text-emerald-800 transition pl-4"
              >
                Write a review
              </button>
            </div>

          </aside>
        </section>

        <section className="border-t border-slate-200 py-8">
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
              similarDoctors.slice(0, 5).map((doc) => (
                <DoctorCard
                  key={doc.user_id || doc.id}
                  doctor={doc}
                  className="shadow-none border border-slate-100"
                  showViewButton={false}
                  showBookButton={false}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">No similar specialists found.</p>
            )}
          </div>
        </section>
      </main>

      <Footer />

      {showReviewModal && (
        <WriteReviewModal
          doctorId={doctor.id}
          doctorName={doctor.name}
          onClose={() => setShowReviewModal(false)}
          onSuccess={() => {
            getDoctorDetails(false);
          }}
        />
      )}

    </div>
  );
};

export default DoctorDetails;
