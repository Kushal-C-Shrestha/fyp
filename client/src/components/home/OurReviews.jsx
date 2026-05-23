import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../../api/axios';
import UserAvatar from '../UserAvatar';

const OurReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        const { data } = await api.get('/reviews/featured', { params: { limit: 3 } });
        setReviews(Array.isArray(data?.reviews) ? data.reviews.slice(0, 3) : []);
      } catch (error) {
        console.error('Failed to load featured reviews:', error);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, []);

  return (
    <section className="bg-slate-50 py-24">
      <div className="page-shell">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700 sm:text-base">Reviews</p>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Real feedback from people who used e-Swasthya to discover doctors,
              book consultations, and continue their care journey.
            </p>
          </div>

          {loading ? (
            <p className="text-center text-sm text-slate-500">Loading reviews...</p>
          ) : reviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {reviews.map((review) => {
                const reviewerName = review.reviewer_name || 'Patient';
                const reviewerProfile = review.reviewer_profile || '';
                const rating = Number(review.rating || 0);
                return (
                  <article key={review.review_id} className="rounded-xl border border-slate-200 bg-white p-6">
                    <div className="flex items-center gap-3">
                      <UserAvatar src={reviewerProfile} name={reviewerName} size="h-12 w-12" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 sm:text-base">
                          {reviewerName}
                        </h4>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={`${review.review_id}-star-${i}`}
                          className={`h-4 w-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`}
                        />
                      ))}
                    </div>
                    <p className="mt-4 text-sm leading-relaxed text-slate-700">{review.comment || 'No written comment.'}</p>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-sm text-slate-500">No reviews available right now.</p>
          )}
        </div>
      </div>
    </section>
  );
};

export default OurReviews;

