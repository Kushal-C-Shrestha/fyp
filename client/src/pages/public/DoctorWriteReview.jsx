import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Building2, ChevronLeft, Star, CheckCircle } from 'lucide-react';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import api from '../../api/axios';
import { useAuth } from '../../hooks/useAuth.js';

const DoctorWriteReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [eligibilityChecked, setEligibilityChecked] = useState(false);
  const [isEligible, setIsEligible] = useState(false);
  const [eligibilityMessage, setEligibilityMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadDoctor = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      try {
        const [doctorRes, eligibilityRes] = await Promise.all([
          api.get(`/doctors/${id}`),
          api.get(`/doctors/${id}/reviews/eligibility`),
        ]);

        setDoctor(doctorRes?.data?.doctor || { id, user_name: 'Doctor', specialization_name: 'General Medicine' });
        setIsEligible(Boolean(eligibilityRes?.data?.eligible));
        setEligibilityMessage(eligibilityRes?.data?.reason || '');
      } catch (loadError) {
        setDoctor({ id, user_name: 'Doctor', specialization_name: 'General Medicine' });
        setIsEligible(false);
        setEligibilityMessage(loadError?.response?.data?.message || 'Could not verify review eligibility.');
      } finally {
        setEligibilityChecked(true);
        setLoading(false);
      }
    };

    loadDoctor();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id, user, navigate]);

  const doctorView = {
    id: doctor?.user_id || doctor?.id || id,
    name: doctor?.user_name || doctor?.name || 'Doctor',
    specialty: doctor?.specialization_name || doctor?.specialty || 'General Medicine',
    profile: doctor?.user_profile || doctor?.profile || '',
    hospital: doctor?.hospital_name || doctor?.hospital || 'General Hospital',
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!eligibilityChecked || !isEligible) {
      setError(eligibilityMessage || 'You are not eligible to review this doctor.');
      return;
    }

    if (!rating) {
      setError('Please select a star rating.');
      return;
    }

    if (comment.trim().length < 10) {
      setError('Please write at least 10 characters in your review.');
      return;
    }

    try {
      await api.post(`/doctors/${doctorView.id}/reviews`, {
        rating,
        comment: comment.trim(),
      });
      setSubmitted(true);
      setTimeout(() => navigate(`/doctors/${doctorView.id}/reviews`), 900);
    } catch (submitError) {
      const message = submitError?.response?.data?.message || 'Could not submit your review. Please try again.';
      setError(message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Navbar />
        <main className="mt-[74px] px-4 py-8 sm:px-6 lg:px-10">
          <p className="text-sm text-slate-500">Loading doctor...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />

      <main className="mt-[74px] px-4 py-7 sm:px-6 lg:px-10">
        <button
          onClick={() => navigate(`/doctors/${doctorView.id}/reviews`)}
          className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-emerald-700"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to reviews
        </button>

        <section className="border-b border-slate-200 pb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[104px_minmax(0,1fr)] sm:items-center">
            <div className="h-[104px] w-[104px] overflow-hidden rounded-2xl bg-slate-100">
              {doctorView.profile ? (
                <img src={doctorView.profile} alt={doctorView.name} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-slate-400">
                  {doctorView.name.charAt(0)}
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">{doctorView.specialty}</p>
              <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900 sm:text-[30px]">Leave a Review for {doctorView.name}</h1>
              <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                <Building2 className="h-4 w-4" />
                {doctorView.hospital}
              </p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="max-w-3xl py-7">
          {!isEligible && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {eligibilityMessage || 'You can write a review only after completing an appointment with this doctor.'}
            </div>
          )}

          <div className="border-b border-slate-200 pb-6">
            <p className="text-sm font-semibold text-slate-900">Your Rating</p>
            <div className="mt-3 flex items-center gap-1">
              {Array.from({ length: 5 }).map((_, idx) => {
                const star = idx + 1;
                const active = (hoverRating || rating) >= star;
                return (
                  <button
                    key={`rate-${star}`}
                    type="button"
                    disabled={!isEligible}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Star className={`h-7 w-7 transition ${active ? 'fill-yellow-400 text-yellow-500' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-6">
            <label className="text-sm font-semibold text-slate-900" htmlFor="review-comment">Your Review</label>
            <textarea
              id="review-comment"
              rows={6}
              maxLength={700}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your consultation experience..."
              disabled={!isEligible}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            <div className="mt-2 flex items-center justify-between">
              <p className="text-xs text-slate-400">Your review will be submitted to the server.</p>
              <p className="text-xs text-slate-400">{comment.length}/700</p>
            </div>
          </div>

          {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

          {submitted && (
            <p className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              <CheckCircle className="h-4 w-4" />
              Review submitted. Redirecting to all reviews...
            </p>
          )}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="submit"
              disabled={!isEligible}
              className="rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
            >
              Submit Review
            </button>
            <button
              type="button"
              onClick={() => navigate(`/doctors/${doctorView.id}/reviews`)}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
};

export default DoctorWriteReview;

