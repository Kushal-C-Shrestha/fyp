import React, { useEffect, useState } from "react";
import { Star } from "lucide-react";
import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";

const VIEW_CONFIG = {
  doctor: {
    title: "Doctor Reviews",
    scope: "doctor",
  },
  hospital: {
    title: "Hospital Reviews",
    scope: "hospital",
  },
  system: {
    title: "System Reviews",
    scope: "system",
  },
};

const AdminReviews = ({ view = "system" }) => {
  const config = VIEW_CONFIG[view] || VIEW_CONFIG.system;
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        setError("");
        const { data } = await api.get("/admin/reviews", {
          params: { scope: config.scope },
        });
        setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
      } catch (err) {
        setReviews([]);
        setError(err?.response?.data?.message || "Failed to load reviews.");
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [config.scope]);

  return (
    <>
      <div>
        {error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <DataTable
          columns={[
            ...(config.scope === "system" ? [{ label: "Type" }] : []),
            { label: "Target" },
            { label: "Reviewer" },
            { label: "Rating" },
            { label: "Comment" },
            { label: "Date" },
          ]}
          data={reviews}
          getRowKey={(review) => review.review_id}
          loading={loading}
          loadingText="Loading reviews..."
          emptyText="No reviews found."
          pagination
          pageSize={10}
          resetPageKey={config.scope}
          renderRow={(review) => (
                  <tr key={review.review_id} className="align-top">
                    {config.scope === "system" ? (
                      <td className="px-4 py-3 text-slate-700">{review.review_type || "-"}</td>
                    ) : null}
                    <td className="px-4 py-3 text-slate-900">
                      {review.target_name || review.doctor_name || review.hospital_name || "Review Target"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{review.reviewer_name || "Unknown reviewer"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <span className="inline-flex items-center gap-1 font-semibold">
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                        {Number(review.rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{review.comment || "No comment provided."}</td>
                    <td className="px-4 py-3 text-slate-700">
                      {review.created_at
                        ? new Date(review.created_at).toLocaleDateString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "-"}
                    </td>
                  </tr>
          )}
        />
      </div>
    </>
  );
};

export default AdminReviews;
