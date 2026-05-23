import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building, MapPin, ShieldPlus, Stethoscope, Star } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import WriteReviewModal from '../../components/WriteReviewModal';
import UserAvatar from '../../components/UserAvatar';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth.js';

const HospitalDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [hospital, setHospital] = useState(null);
  const [loadingHospital, setLoadingHospital] = useState(true);
  const [doctors, setDoctors] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loadingSideData, setLoadingSideData] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    const loadHospital = async () => {
      try {
        const hospitalRes = await api.get(`/hospitals/${id}`);
        setHospital(hospitalRes?.data?.hospital || null);
      } catch (error) {
        console.error('Error loading hospital details:', error);
        setHospital(null);
      } finally {
        setLoadingHospital(false);
      }
    };

    const loadSideData = async () => {
      try {
        const [doctorsRes, reviewsRes] = await Promise.allSettled([
          api.get(`/hospitals/${id}/doctors`),
          api.get(`/hospitals/${id}/reviews`),
        ]);

        if (doctorsRes.status === 'fulfilled') {
          setDoctors(Array.isArray(doctorsRes.value?.data?.doctors) ? doctorsRes.value.data.doctors : []);
        } else {
          console.error('Error loading hospital doctors:', doctorsRes.reason);
          setDoctors([]);
        }

        if (reviewsRes.status === 'fulfilled') {
          setReviews(Array.isArray(reviewsRes.value?.data?.reviews) ? reviewsRes.value.data.reviews : []);
        } else {
          console.error('Error loading hospital reviews:', reviewsRes.reason);
          setReviews([]);
        }
      } catch (error) {
        console.error('Error loading hospital side data:', error);
        setDoctors([]);
        setReviews([]);
      } finally {
        setLoadingSideData(false);
      }
    };

    loadHospital();
    loadSideData();
  }, [id]);

  const services = useMemo(() => {
    if (!hospital || !Array.isArray(hospital.departments)) return [];
    return hospital.departments.filter(Boolean);
  }, [hospital]);

  const facilities = useMemo(() => {
    if (!hospital || !Array.isArray(hospital.facilities)) return [];
    return hospital.facilities.filter(Boolean);
  }, [hospital]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main className="mt-[74px]">
        <section className="grid grid-cols-1 gap-8 px-4 py-6 pb-20 sm:px-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10">
          <div>
            {/* Header */}
            <div className="pb-6 border-b border-slate-200 mb-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="h-44 w-full overflow-hidden rounded-2xl sm:h-48 sm:w-48 shrink-0 flex items-center justify-center border border-slate-200 bg-slate-50">
                  {hospital?.hospital_image ? (
                    <img
                      src={hospital.hospital_image}
                      alt={hospital?.hospital_name || 'Hospital'}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-700">
                      <Building className="h-20 w-20 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-emerald-700">{hospital?.hospital_type || 'Hospital'}</p>
                  <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-[28px]">
                    {loadingHospital ? 'Loading hospital...' : hospital?.hospital_name || 'Hospital not found'}
                  </h1>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>{hospital?.hospital_address || 'Address unavailable'}</span>
                  </p>
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-600">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                    <span>
                      <span className="font-semibold text-slate-800">
                        {Number(hospital?.avg_rating || 0).toFixed(1)}
                      </span>{' '}
                      <span className="text-slate-500">
                        ({hospital?.review_count || 0} {hospital?.review_count === 1 ? 'review' : 'reviews'})
                      </span>
                    </span>
                  </p>
                </div>

                <button
                  onClick={() => navigate(`/doctors?hospital=${id}`)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 sm:self-center shrink-0"
                >
                  <Stethoscope className="h-4 w-4" />
                  Find Doctor
                </button>
              </div>
            </div>

            <section className="border-b border-slate-200 py-6 pt-0">
              <h2 className="mb-2 inline-flex items-center gap-2 text-base font-bold text-slate-900">
                <Building className="h-4 w-4 text-emerald-700" />
                About Hospital
              </h2>
              {loadingHospital ? (
                <p className="text-sm leading-7 text-slate-500">Loading hospital overview...</p>
              ) : (
                <p className="text-sm leading-7 text-slate-600">
                  {hospital?.hospital_description || 'Hospital description is not available yet.'}
                </p>
              )}
            </section>

            <section className="border-b border-slate-200 py-6">
              <h2 className="mb-3 inline-flex items-center gap-2 text-base font-bold text-slate-900">
                <Stethoscope className="h-4 w-4 text-emerald-700" />
                Services
              </h2>
              {loadingHospital ? (
                <p className="text-sm text-slate-500">Loading services...</p>
              ) : services.length > 0 ? (
                <ul className="grid grid-cols-1 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 sm:gap-x-8">
                  {services.map((service) => (
                    <li key={service}>{service}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No services listed yet.</p>
              )}
            </section>

            <section className="py-6">
              <h2 className="mb-2 inline-flex items-center gap-2 text-base font-bold text-slate-900">
                <ShieldPlus className="h-4 w-4 text-emerald-700" />
                Facilities
              </h2>
              {loadingHospital ? (
                <p className="text-sm text-slate-500">Loading facilities...</p>
              ) : facilities.length > 0 ? (
                <ul className="grid grid-cols-1 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 sm:gap-x-8">
                  {facilities.map((facility) => (
                    <li key={facility}>{facility}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No facilities listed yet.</p>
              )}
            </section>
          </div>

          <aside className="h-fit py-1 lg:border-l lg:border-slate-200 lg:pl-6">
            <section className="border-b border-slate-200 pb-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">Doctors</h2>
              </div>
              <div className="space-y-3">
                {loadingSideData ? (
                  <p className="text-sm text-slate-500">Loading doctors...</p>
                ) : doctors.length > 0 ? (
                  doctors.slice(0, 4).map((doctor) => (
                    <div key={doctor.user_id} className="flex items-center gap-3 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
                      <UserAvatar
                        src={doctor.user_profile_picture}
                        name={doctor.user_name}
                        size="h-10 w-10 shrink-0"
                      />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{doctor.user_name}</p>
                        <p className="text-xs text-slate-500">{doctor.specialization_name || 'General Medicine'}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No doctors listed yet.</p>
                )}
              </div>
              <div className="mt-4">
                <button
                  onClick={() => navigate(`/doctors?hospital=${id}`)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View More
                </button>
              </div>
            </section>

            <section className="pt-6">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-slate-900">Patient Reviews</h2>
              </div>
              <div className="space-y-4">
                {loadingSideData ? (
                  <p className="text-sm text-slate-500">Loading reviews...</p>
                ) : reviews.length > 0 ? (
                  reviews.slice(0, 2).map((review) => (
                    <article key={review.review_id} className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                      <p className="text-sm font-semibold text-slate-900">{review.reviewer_name || 'Patient'}</p>
                      <div className="mt-1 flex items-center gap-0.5">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={`${review.review_id}-${idx}`}
                            className={`h-3.5 w-3.5 ${idx < Number(review.rating || 0) ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'}`}
                          />
                        ))}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{review.comment}</p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-slate-500">No reviews yet.</p>
                )}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button
                  onClick={() => navigate(`/hospitals/${id}/reviews`, { state: { hospital } })}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  See More
                </button>
                <button
                  onClick={() => user ? setShowReviewModal(true) : navigate('/login')}
                  className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-800"
                >
                  Leave a Review
                </button>
              </div>
            </section>
          </aside>
        </section>
      </main>

      <Footer />

      {showReviewModal && (
        <WriteReviewModal
          hospitalId={id}
          targetName={hospital?.hospital_name || 'Hospital'}
          onClose={() => setShowReviewModal(false)}
          onSuccess={async () => {
             // Re-fetch reviews to show the new one in the sidebar
             const reviewsRes = await api.get(`/hospitals/${id}/reviews`);
             setReviews(Array.isArray(reviewsRes.data?.reviews) ? reviewsRes.data.reviews : []);
          }}
        />
      )}
    </div>
  );
};

export default HospitalDetails;
