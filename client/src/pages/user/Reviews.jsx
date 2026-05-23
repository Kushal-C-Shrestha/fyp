import React, { useEffect, useState } from "react";
import { Pencil, Star, Trash2 } from "lucide-react";
import api from "../../api/axios";
import WriteReviewModal from "../../components/WriteReviewModal.jsx";

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const [modalReview, setModalReview] = useState(null);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setError("");
        const { data } = await api.get("/reviews/me");
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      } catch (fetchError) {
        setReviews([]);
        setError(fetchError?.response?.data?.message || "Failed to load review history.");
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, []);

  const handleDelete = async (reviewId) => {
    try {
      setError("");
      setDeletingId(reviewId);
      await api.delete(`/reviews/me/${reviewId}`);
      setReviews((prev) => prev.filter((r) => r.review_id !== reviewId));
    } catch (deleteError) {
      setError(deleteError?.response?.data?.message || "Failed to delete review.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditSuccess = (updated) => {
    if (!updated) return;
    setReviews((prev) =>
      prev.map((r) =>
        r.review_id === modalReview?.review_id
          ? { ...r, rating: updated.rating ?? r.rating, comment: updated.comment ?? r.comment }
          : r
      )
    );
  };

  return (
    <>
      {loading ? (
        <p className="text-sm text-slate-500">Loading reviews...</p>
      ) : error ? (
        <p className="text-sm font-medium text-rose-600">{error}</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
          You have not written any reviews yet.
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const type = String(review.review_type || "").toLowerCase();
            const target =
              type === "doctor"
                ? review.doctor_name || `Doctor #${review.doctor_id}`
                : review.hospital_name || `Hospital #${review.hospital_id}`;

            const createdAt = review.created_at
              ? new Date(review.created_at).toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })
              : "-";

            return (
              <article key={review.review_id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900">{target}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{createdAt}</p>
                    <div className="mt-1.5 flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star
                          key={`${review.review_id}-star-${idx}`}
                          className={`h-3.5 w-3.5 ${
                            idx < Number(review.rating || 0) ? "fill-yellow-400 text-yellow-500" : "text-slate-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Edit review"
                      onClick={() => setModalReview(review)}
                      className="rounded-lg p-1.5 text-yellow-500"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      title="Delete review"
                      disabled={deletingId === review.review_id}
                      onClick={() => handleDelete(review.review_id)}
                      className="rounded-lg p-1.5 text-red-500 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-600">{review.comment || "No written comment."}</p>
              </article>
            );
          })}
        </div>
      )}

      {modalReview && (
        <WriteReviewModal
          doctorName={
            String(modalReview.review_type || "").toLowerCase() === "doctor"
              ? modalReview.doctor_name || "Doctor"
              : modalReview.hospital_name || "Hospital"
          }
          reviewId={modalReview.review_id}
          initialRating={modalReview.rating}
          initialComment={modalReview.comment || ""}
          onClose={() => setModalReview(null)}
          onSuccess={(updated) => { handleEditSuccess(updated); setModalReview(null); }}
        />
      )}
    </>
  );
};

export default Reviews;
