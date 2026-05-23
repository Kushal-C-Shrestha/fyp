import React, { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";
import DataTable from "../../components/ui/DataTable";

const normalizeStatus = (value) => String(value || "").trim().toLowerCase();

const AdminRequestsOverview = () => {
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [hospitalRequests, setHospitalRequests] = useState([]);
  const [blogStats, setBlogStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadRequests = async () => {
      try {
        setError("");
        const [doctorRes, hospitalRes, blogRes] = await Promise.all([
          api.get("/doctor-requests"),
          api.get("/hospital-requests"),
          api.get("/blogs/admin/stats"),
        ]);
        setDoctorRequests(Array.isArray(doctorRes?.data?.requests) ? doctorRes.data.requests : []);
        setHospitalRequests(Array.isArray(hospitalRes?.data?.requests) ? hospitalRes.data.requests : []);
        setBlogStats(blogRes?.data?.stats || null);
      } catch (err) {
        setDoctorRequests([]);
        setHospitalRequests([]);
        setBlogStats(null);
        setError(err?.response?.data?.message || "Failed to load requests.");
      } finally {
        setLoading(false);
      }
    };

    loadRequests();
  }, []);

  const stats = useMemo(() => {
    const doctorPending = doctorRequests.filter((item) => normalizeStatus(item.request_status) === "pending").length;
    const hospitalPending = hospitalRequests.filter((item) => normalizeStatus(item.request_status) === "pending").length;
    const blogPending = Number(blogStats?.pending_blogs) || 0;
    return {
      doctorPending,
      hospitalPending,
      blogPending,
      totalPending: doctorPending + hospitalPending + blogPending,
    };
  }, [blogStats?.pending_blogs, doctorRequests, hospitalRequests]);

  return (
    <>
      <div>
        {error ? (
          <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <DataTable
          columns={[{ label: "Request Type" }, { label: "Pending" }]}
          data={[
            { id: "doctor", label: "Doctor Requests", count: stats.doctorPending },
            { id: "hospital", label: "Hospital Requests", count: stats.hospitalPending },
            { id: "blog", label: "Blog Requests", count: stats.blogPending },
            { id: "total", label: "Total Pending", count: stats.totalPending, total: true },
          ]}
          getRowKey={(item) => item.id}
          loading={loading}
          loadingText="Loading request summary..."
          emptyText="No request summary found."
          pagination
          pageSize={10}
          renderRow={(item) => (
            <tr>
              <td className={`px-4 py-3 ${item.total ? "font-semibold text-slate-900" : "text-slate-900"}`}>{item.label}</td>
              <td className={`px-4 py-3 ${item.total ? "font-semibold text-slate-700" : "text-slate-700"}`}>{item.count}</td>
            </tr>
          )}
        />
      </div>
    </>
  );
};

export default AdminRequestsOverview;
