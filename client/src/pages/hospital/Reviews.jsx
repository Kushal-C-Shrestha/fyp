import React, { useEffect, useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import DataTable from "../../components/ui/DataTable";
import { formatShortDate, getMyHospitalContext } from "../../utils/hospitalDashboard";
import api from "../../api/axios";

const REVIEW_SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "rating_high", label: "Rating High-Low" },
  { value: "rating_low", label: "Rating Low-High" },
];

const REVIEW_FILTER_OPTIONS = [
  { value: "all", label: "All ratings" },
  { value: "high", label: "4 stars and up" },
  { value: "mid", label: "3 stars" },
  { value: "low", label: "2 stars and below" },
];

const REVIEW_COLUMNS = [
  { label: "Reviewer", className: "sm:px-6 lg:px-7" },
  { label: "Rating" },
  { label: "Date" },
  { label: "Comment", className: "sm:px-6 lg:px-7" },
];

const getReviewTimestamp = (value) => {
  const timestamp = Date.parse(String(value || ""));
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        setError("");

        const hospitalContext = await getMyHospitalContext();
        const reviewsRes = await api.get(`/hospitals/${hospitalContext.hospital_id}/reviews`);
        setReviews(Array.isArray(reviewsRes?.data?.reviews) ? reviewsRes.data.reviews : []);
      } catch (err) {
        setReviews([]);
        setError(err?.response?.data?.message || "Failed to load hospital reviews.");
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, []);

  const visibleReviews = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const filtered = reviews.filter((review) => {
      const rating = Number(review?.rating || 0);
      const ratingMatches =
        ratingFilter === "all" ||
        (ratingFilter === "high" && rating >= 4) ||
        (ratingFilter === "mid" && Math.round(rating) === 3) ||
        (ratingFilter === "low" && rating <= 2.99);

      if (!ratingMatches) return false;

      if (!query) return true;

      const haystack = [review?.reviewer_name, review?.comment, review?.doctor_name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(query);
    });

    const sorted = [...filtered];

    if (sortBy === "oldest") {
      sorted.sort((a, b) => getReviewTimestamp(a?.created_at) - getReviewTimestamp(b?.created_at));
      return sorted;
    }

    if (sortBy === "rating_high") {
      sorted.sort((a, b) => {
        const byRating = Number(b?.rating || 0) - Number(a?.rating || 0);
        if (byRating !== 0) return byRating;
        return getReviewTimestamp(b?.created_at) - getReviewTimestamp(a?.created_at);
      });
      return sorted;
    }

    if (sortBy === "rating_low") {
      sorted.sort((a, b) => {
        const byRating = Number(a?.rating || 0) - Number(b?.rating || 0);
        if (byRating !== 0) return byRating;
        return getReviewTimestamp(b?.created_at) - getReviewTimestamp(a?.created_at);
      });
      return sorted;
    }

    sorted.sort((a, b) => getReviewTimestamp(b?.created_at) - getReviewTimestamp(a?.created_at));
    return sorted;
  }, [reviews, sortBy, ratingFilter, searchTerm]);

  return (
    <>
      <div className="bg-white">
        {error ? (
          <div className="px-5 pt-5 sm:px-6 lg:px-7">
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          </div>
        ) : null}

        <div className="mb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <label className="relative w-full sm:w-[320px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search reviewer or comment"
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || reviews.length === 0}
              >
                {REVIEW_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>

              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:ring-2 focus:ring-sky-100"
                disabled={loading || reviews.length === 0}
              >
                {REVIEW_FILTER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    Filter: {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <DataTable
          columns={REVIEW_COLUMNS}
          data={visibleReviews}
          getRowKey={(review) => review.review_id}
          loading={loading}
          loadingText="Loading reviews..."
          emptyText="No reviews found."
          pagination
          pageSize={10}
          resetPageKey={`${searchTerm}|${ratingFilter}|${sortBy}`}
          renderRow={(review) => (
            <tr className="align-top hover:bg-slate-50/70">
              <td className="px-5 py-4 sm:px-6 lg:px-7">
                <div className="flex items-center gap-3">
                  {review.reviewer_profile ? (
                    <img
                      src={review.reviewer_profile}
                      alt={review.reviewer_name || "Patient"}
                      className="h-9 w-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                      {String(review.reviewer_name || "P").charAt(0)}
                    </div>
                  )}
                  <p className="font-semibold text-slate-900">{review.reviewer_name || "Patient"}</p>
                </div>
              </td>
              <td className="px-5 py-4">
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                  {Number(review.rating || 0).toFixed(1)}
                </span>
              </td>
              <td className="px-5 py-4 text-slate-600">{formatShortDate(review.created_at)}</td>
              <td className="px-5 py-4 text-slate-700 sm:px-6 lg:px-7">{review.comment || "No comment provided."}</td>
            </tr>
          )}
        />
      </div>
    </>
  );
};

export default Reviews;
