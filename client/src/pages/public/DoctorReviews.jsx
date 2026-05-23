import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { Building2, ChevronLeft, ChevronDown, Star } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import WriteReviewModal from '../../components/WriteReviewModal';
import Pagination from '../../components/ui/Pagination';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth.js';
import UserAvatar from '../../components/UserAvatar';

const PER_PAGE = 8;

const DoctorReviews = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(location.state?.doctor || null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const load = async () => {
      try {
        const calls = [api.get(`/doctors/${id}/reviews`)];
        if (!doctor) calls.unshift(api.get(`/doctors/${id}`));
        const results = await Promise.all(calls);
        if (!doctor) setDoctor(results[0]?.data?.doctor || null);
        console.log(doctor)
        console.log(results)
        const reviewsRes = doctor ? results[0] : results[1];
        setReviews(reviewsRes?.data?.reviews || []);
      } catch {
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };
    load();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  const total = reviews.length;
  const avg = total > 0 ? (reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / total).toFixed(1) : '0.0';
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const star = Math.max(1, Math.min(5, Math.round(Number(r.rating || 0))));
    breakdown[star] += 1;
  });

  const sorted = [...reviews].sort((a, b) => {
    if (sortBy === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortBy === 'rating_high') return Number(b.rating) - Number(a.rating);
    if (sortBy === 'rating_low') return Number(a.rating) - Number(b.rating);
    return new Date(b.created_at) - new Date(a.created_at);
  });
  const totalPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = sorted.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE);

  const goToPage = (p) => {
    setPage(Math.max(1, Math.min(p, totalPages)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mt-[74px] px-4 py-8 sm:px-6 lg:px-10">
          <p className="text-sm text-slate-500">Loading reviews...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="mt-[74px] px-4 py-7 sm:px-6 lg:px-10">

        <button onClick={() => navigate(`/doctors/${id}`)}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          <ChevronLeft className="h-4 w-4" /> Back to doctor details
        </button>

        {/* Header */}
        <section className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-50 flex items-center justify-center">
              <UserAvatar src={doctor.profile_picture} name={doctor.name} size="h-full w-full" className="rounded-none border-none ring-0" />
            </div>
            <div>
              {doctor.specializations && <p className="text-xs font-semibold tracking-widest text-emerald-700">{doctor.specializations.map(s => s.specializationName).join(', ')}</p>}
              <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">{doctor.name}</h1>
              {doctor.hospitals && (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                  <Building2 className="h-4 w-4 shrink-0" />{doctor.hospitals.map(h => h.hospital_name).join(', ')}
                </p>
              )}
              {total > 0 && (
                <div className="mt-1.5 flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(Number(avg)) ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-sm font-semibold text-slate-800">{avg}</span>
                  <span className="text-sm text-slate-400">({total} {total === 1 ? 'review' : 'reviews'})</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Body */}
        <section className="py-6">
          <div className="grid grid-cols-1 gap-0 lg:grid-cols-[minmax(0,1fr)_260px] lg:divide-x lg:divide-slate-200">
            {/* Review list */}
            <div className="lg:pr-8">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-slate-900">{total} {total === 1 ? 'Review' : 'Reviews'}</p>
                  {total > 0 && <p className="text-xs text-slate-400">Showing {(safePage - 1) * PER_PAGE + 1}–{Math.min(safePage * PER_PAGE, total)} of {total}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <select value={sortBy} onChange={e => { setSortBy(e.target.value); setPage(1); }}
                      className="appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm text-slate-700 outline-none focus:border-emerald-500">
                      <option value="latest">Latest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="rating_high">Rating: High to Low</option>
                      <option value="rating_low">Rating: Low to High</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                  <button onClick={() => user ? setShowWriteModal(true) : navigate('/login')}
                    className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 transition">
                    Write a Review
                  </button>
                </div>
              </div>

              {paged.length > 0 ? (
                <div className="space-y-5">
                  {paged.map(review => {
                    const rating = Number(review.rating || 0);
                    const createdAt = review.created_at
                      ? new Date(review.created_at).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })
                      : '-';
                    return (
                      <article key={review.review_id} className="border-b border-slate-100 pb-5 last:border-b-0 last:pb-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar src={review.reviewer_profile} name={review.reviewer_name} size="h-10 w-10" />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">{review.reviewer_name || 'Patient'}</p>
                              <p className="text-xs text-slate-400">{createdAt}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-0.5">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`h-3.5 w-3.5 ${s <= rating ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'}`} />
                            ))}
                          </div>
                        </div>
                        {review.comment && <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment}</p>}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center">
                  <p className="text-sm text-slate-500">No reviews yet.</p>
                </div>
              )}

              {totalPages > 1 && (
                <Pagination
                  className="mt-8"
                  page={safePage}
                  totalPages={totalPages}
                  totalItems={total}
                  pageSize={PER_PAGE}
                  itemLabel={total === 1 ? "review" : "reviews"}
                  onPageChange={goToPage}
                />
              )}
            </div>

            {/* Review breakdown */}
            <aside className="h-fit pt-6 lg:sticky lg:top-24 lg:pt-0 lg:pl-8">
              <h2 className="text-sm font-semibold text-slate-900">Rating Breakdown</h2>
              <p className="mt-0.5 text-xs text-slate-400">{total} {total === 1 ? 'review' : 'reviews'}</p>
              <div className="mt-4 flex items-end gap-3 border-b border-slate-100 pb-4">
                <p className="text-4xl font-bold text-slate-900">{avg}</p>
                <div className="pb-1">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`h-4 w-4 ${s <= Math.round(Number(avg)) ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">Average score</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                {[5, 4, 3, 2, 1].map(star => {
                  const count = breakdown[star] || 0;
                  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
                  return (
                    <div key={star} className="grid grid-cols-[18px_minmax(0,1fr)_28px] items-center gap-2 text-xs">
                      <span className="font-medium text-slate-500">{star}</span>
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="text-right text-slate-400">{count}</span>
                    </div>
                  );
                })}
              </div>
            </aside>

          </div>
        </section>
      </main>

      <Footer />

      {showWriteModal && (
        <WriteReviewModal
          doctorId={id}
          targetName={doctor?.name || "Doctor"}
          onClose={() => setShowWriteModal(false)}
          onSuccess={() => {
            setShowWriteModal(false);
            api.get(`/doctors/${id}/reviews`)
              .then(res => setReviews(res.data?.reviews || []))
              .catch(() => { });
          }}
        />
      )}
    </div>
  );
};

export default DoctorReviews;
