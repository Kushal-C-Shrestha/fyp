import React, { useEffect, useMemo, useState } from "react";
import { MessageSquareText, Star } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";

const REVIEW_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "rating_high", label: "Rating High-Low" },
  { value: "rating_low", label: "Rating Low-High" },
];

const getReviewTimestamp = (value) => {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const DoctorReviews = () => {
  const { user } = useAuth();
  const [doctorId, setDoctorId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  useEffect(() => {
    const loadDoctorReviews = async () => {
      try {
        setLoading(true);

        const selfDoctorId = Number(user?.id);

        if (!Number.isInteger(selfDoctorId) || selfDoctorId <= 0) {
          setDoctorId(null);
          setReviews([]);
          return;
        }

        setDoctorId(selfDoctorId);

        const reviewsRes = await api.get(`/doctors/${selfDoctorId}/reviews`);
        setReviews(Array.isArray(reviewsRes?.data?.reviews) ? reviewsRes.data.reviews : []);
      } catch {
        setDoctorId(null);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadDoctorReviews();
  }, [user?.id]);

  const stats = useMemo(() => {
    const total = reviews.length;
    const average = total > 0 ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / total : 0;
    const ratingBuckets = [1, 2, 3, 4, 5].map((stars) =>
      reviews.filter((review) => Math.max(1, Math.min(5, Math.round(Number(review.rating || 0)))) === stars).length
    );
    const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratingBuckets[stars - 1],
      percent: total > 0 ? (ratingBuckets[stars - 1] / total) * 100 : 0,
    }));
    const maxBucket = Math.max(...ratingBreakdown.map((item) => item.count), 1);

    return {
      total,
      average,
      ratingBreakdown,
      maxBucket,
    };
  }, [reviews]);

  const visibleReviews = useMemo(() => {
    const sorted = [...reviews];

    if (sortBy === "oldest") {
      sorted.sort((a, b) => getReviewTimestamp(a?.created_at) - getReviewTimestamp(b?.created_at));
    } else if (sortBy === "rating_high") {
      sorted.sort((a, b) => {
        const byRating = Number(b?.rating || 0) - Number(a?.rating || 0);
        if (byRating !== 0) return byRating;
        return getReviewTimestamp(b?.created_at) - getReviewTimestamp(a?.created_at);
      });
    } else if (sortBy === "rating_low") {
      sorted.sort((a, b) => {
        const byRating = Number(a?.rating || 0) - Number(b?.rating || 0);
        if (byRating !== 0) return byRating;
        return getReviewTimestamp(b?.created_at) - getReviewTimestamp(a?.created_at);
      });
    } else {
      sorted.sort((a, b) => getReviewTimestamp(b?.created_at) - getReviewTimestamp(a?.created_at));
    }

    return sorted.slice(0, 24);
  }, [reviews, sortBy]);

  return (
    <>
      <div className="min-h-full bg-white">
        <div className="w-full">
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px]">
            <section className="min-w-0">
              <div className="flex flex-wrap items-end justify-between gap-3 pb-2">
                <p className="text-base font-semibold text-slate-900">Patient Reviews</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">{loading ? "Loading..." : `${stats.total} total`}</span>
                  <select
                    className="border border-slate-300 px-2 py-1 text-xs text-slate-700"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value)}
                    disabled={loading || reviews.length === 0}
                  >
                    {REVIEW_SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200">
                {loading ? (
                  <p className="py-6 text-sm text-slate-500">Loading reviews...</p>
                ) : visibleReviews.length > 0 ? (
                  visibleReviews.map((review) => (
                    <article key={review.review_id} className="border-b border-slate-200 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          {review.reviewer_profile ? (
                            <img
                              src={review.reviewer_profile}
                              alt={review.reviewer_name || "Patient"}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                              {String(review.reviewer_name || "P").charAt(0)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{review.reviewer_name || "Patient"}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {review.created_at
                                ? new Date(review.created_at).toLocaleDateString([], {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "-"}
                            </p>
                          </div>
                        </div>
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                          {Number(review.rating || 0).toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">{review.comment || "No comment provided."}</p>
                    </article>
                  ))
                ) : (
                  <div className="border-b border-slate-200 py-6 text-sm text-slate-600">
                    <p className="inline-flex items-center gap-2">
                      <MessageSquareText className="h-4 w-4" />
                      {doctorId ? "No reviews yet for your profile." : "Doctor profile not found for this account."}
                    </p>
                  </div>
                )}
              </div>
            </section>

            <aside className="min-w-0 lg:border-l lg:border-slate-200 lg:pl-6">
              <p className="text-base font-semibold text-slate-900">Rating Overview</p>

              <div className="mt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average Rating</p>
                <p className="mt-1 text-3xl font-bold leading-none text-slate-900">
                  {loading ? "-" : stats.average.toFixed(1)}
                  <span className="ml-1 text-base font-semibold text-slate-500">/ 5</span>
                </p>
                <div className="mt-2 flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={`avg-star-${star}`}
                      className={`h-3.5 w-3.5 ${
                        star <= Math.round(stats.average || 0) ? "fill-amber-400 text-amber-500" : "text-slate-300"
                      }`}
                    />
                  ))}
                  <span className="ml-1 text-xs text-slate-500">{loading ? "-" : `${stats.total} reviews`}</span>
                </div>
              </div>

              <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Distribution</p>
              <div className="mt-2 space-y-3">
                {stats.ratingBreakdown.map((item) => (
                  <div key={item.stars} className="grid grid-cols-[30px_minmax(0,1fr)_30px] items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">{item.stars}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-2.5 rounded-full bg-cyan-500"
                        style={{ width: loading ? "0%" : `${(item.count / stats.maxBucket) * 100}%` }}
                      />
                    </div>
                    <span className="text-right text-xs font-semibold text-slate-700">{loading ? "-" : item.count}</span>
                  </div>
                ))}
              </div>

              {!loading && stats.total === 0 ? <p className="mt-3 text-xs text-slate-500">No ratings yet.</p> : null}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default DoctorReviews;
