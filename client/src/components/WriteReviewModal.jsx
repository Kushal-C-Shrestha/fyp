import React, { useEffect, useState } from 'react';
import { Check, Loader2, Star, X, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const WriteReviewModal = ({
  doctorId,
  hospitalId,
  targetName,
  reviewId,
  initialRating = 0,
  initialComment = '',
  onClose,
  onSuccess,
}) => {
  const isEditing = Boolean(reviewId);
  const entity = doctorId ? 'doctor' : 'hospital';
  const entityId = doctorId || hospitalId;

  const [eligible, setEligible] = useState(isEditing);
  const [eligibilityReason, setEligibilityReason] = useState('');
  const [eligibilityLoading, setEligibilityLoading] = useState(!isEditing);

  const [rating, setRating] = useState(isEditing ? Number(initialRating) : 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(isEditing ? initialComment : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isEditing || !entityId) { setEligibilityLoading(false); return; }

    let cancelled = false;
    const check = async () => {
      try {
        const endpoint = entity === 'doctor' 
          ? `/doctors/${entityId}/reviews/eligibility` 
          : `/hospitals/${entityId}/reviews/eligibility`;
        const { data } = await api.get(endpoint);
        if (cancelled) return;
        setEligible(Boolean(data?.eligible));
        setEligibilityReason(data?.reason || '');
      } catch (err) {
        if (cancelled) return;
        setEligible(false);
        setEligibilityReason(
          err?.response?.data?.message || 'Could not verify eligibility. Please try again later.'
        );
      } finally {
        if (!cancelled) setEligibilityLoading(false);
      }
    };
    check();
    return () => { cancelled = true; };
  }, [entityId, entity, isEditing]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isEditing && !eligible) {
      setError(eligibilityReason || `You are not eligible to review this ${entity}.`);
      return;
    }
    if (!rating) { setError('Please select a star rating.'); return; }

    setSubmitting(true);
    try {
      let result;
      if (isEditing) {
        const { data } = await api.put(`/reviews/me/${reviewId}`, { rating, comment: comment.trim() });
        result = data?.review;
      } else {
        const endpoint = entity === 'doctor' 
          ? `/doctors/${entityId}/reviews` 
          : `/hospitals/${entityId}/reviews`;
        await api.post(endpoint, { rating, comment: comment.trim() });
      }
      setSuccess(true);
      onSuccess?.(result);
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
              {isEditing ? 'Edit Review' : 'Write a Review'}
            </p>
            <h2 className="text-base font-bold text-slate-900">{targetName}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* Success Message */}
          {success ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Check className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Success!</h3>
              <p className="mt-2 text-sm text-slate-500">
                {isEditing 
                  ? 'Your review has been updated successfully.' 
                  : `Your review for ${targetName} has been submitted.`}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-8 w-full rounded-xl bg-emerald-700 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Great, thanks!
              </button>
            </div>
          ) : (
            <>
              {/* Loading eligibility */}
              {eligibilityLoading && (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking eligibility…
                </div>
              )}

              {/* Not eligible */}
              {!eligibilityLoading && !isEditing && !eligible && (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-4 ring-amber-50">
                    <AlertCircle className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Review Eligibility Required</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-500 max-w-xs">
                    {eligibilityReason || `To ensure authentic feedback, you can only submit a review after completing an appointment with this ${entity}.`}
                  </p>
                </div>
              )}

              {/* Review form (eligible or editing) */}
              {!eligibilityLoading && (isEditing || eligible) && (
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Star rating */}
                  <div>
                    <p className="mb-2 text-sm font-semibold text-slate-800">Your Rating</p>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onMouseEnter={() => setHover(star)}
                          onMouseLeave={() => setHover(0)}
                          onClick={() => setRating(star)}
                          className="p-0.5"
                        >
                          <Star
                            className={`h-8 w-8 transition ${
                              (hover || rating) >= star ? 'fill-yellow-400 text-yellow-500' : 'text-slate-200'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-800" htmlFor="modal-review-comment">
                      Your Review
                    </label>
                    <textarea
                      id="modal-review-comment"
                      rows={4}
                      maxLength={700}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder={`Share your experience with this ${entity}…`}
                      className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                    />
                    <p className="mt-1 text-right text-xs text-slate-400">{comment.length}/700</p>
                  </div>

                  {error && <p className="text-sm font-medium text-red-500">{error}</p>}

                  <div className="flex gap-3 pt-1">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 rounded-xl bg-emerald-700 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {submitting
                        ? (isEditing ? 'Saving…' : 'Submitting…')
                        : (isEditing ? 'Save Changes' : 'Submit Review')}
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Cancel
                    </button>
                  </div>

                </form>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default WriteReviewModal;
