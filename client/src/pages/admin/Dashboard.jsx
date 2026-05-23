import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Chart from "react-apexcharts";
import {
  Users,
  Building2,
  Stethoscope,
  CalendarCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

const pct = (a, b) => {
  const prev = Number(b);
  const curr = Number(a);
  if (!prev) return curr > 0 ? 100 : 0;
  return Math.round(((curr - prev) / prev) * 100);
};

const statusColor = (s) => {
  const v = String(s || "").toLowerCase();
  if (v === "pending") return "bg-amber-50 text-amber-700 border-amber-100";
  if (v === "approved" || v === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (v === "rejected" || v === "cancelled") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-slate-50 text-slate-600 border-slate-100";
};

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "-";

const CHART_FONT = "'Inter', 'ui-sans-serif', system-ui, sans-serif";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats")
      .then(({ data }) => setStats(data.stats))
      .catch((err) => setError(err?.response?.data?.message || "Failed to load dashboard statistics."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-sky-600" />
            <p className="text-sm font-medium text-slate-500">Loading platform metrics…</p>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-400" />
          <p className="mt-3 font-semibold text-rose-800">{error}</p>
        </div>
      </>
    );
  }

  const {
    summary,
    roleDistribution,
    userGrowth,
    appointmentTrends,
    topHospitals,
    recentRequests,
    appointmentStatusBreakdown,
    doctorRequestStatus,
    hospitalRequestStatus,
    weeklyAppointments,
    weeklyUsers,
  } = stats;

  const apptPct = weeklyAppointments ? pct(weeklyAppointments.this_week, weeklyAppointments.last_week) : undefined;
  const userPct = weeklyUsers ? pct(weeklyUsers.this_week, weeklyUsers.last_week) : undefined;

  const summaryCards = [
    {
      label: "Total Users",
      value: Number(summary.total_users).toLocaleString(),
      sub: `${Number(weeklyUsers?.this_week || 0)} new this week`,
      trend: userPct,
      icon: Users,
      accent: "text-sky-600",
      bg: "bg-sky-50",
    },
    {
      label: "Doctors",
      value: Number(summary.total_doctors).toLocaleString(),
      sub: `${summary.pending_doctor_requests} pending approval`,
      icon: Stethoscope,
      accent: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Hospitals",
      value: Number(summary.total_hospitals).toLocaleString(),
      sub: `${summary.pending_hospital_requests} pending approval`,
      icon: Building2,
      accent: "text-indigo-600",
      bg: "bg-indigo-50",
    },
    {
      label: "Appointments",
      value: Number(summary.total_appointments).toLocaleString(),
      sub: `${Number(weeklyAppointments?.this_week || 0)} this week`,
      trend: apptPct,
      icon: CalendarCheck,
      accent: "text-amber-600",
      bg: "bg-amber-50",
    },
  ];

  // --- Chart: Growth (area, last 30 days) ---
  const growthOpts = {
    chart: { toolbar: { show: false }, zoom: { enabled: false }, fontFamily: CHART_FONT, sparkline: { enabled: false } },
    stroke: { curve: "smooth", width: [2.5, 2.5] },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.02, stops: [0, 100] } },
    colors: ["#0ea5e9", "#10b981"],
    xaxis: {
      type: "datetime",
      categories: userGrowth.map((d) => d.date),
      labels: { style: { colors: "#94a3b8", fontSize: "11px" } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "11px" } }, min: 0 },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    legend: { position: "top", horizontalAlign: "right", fontSize: "12px", fontWeight: 600 },
    tooltip: { x: { format: "dd MMM yyyy" }, shared: true, intersect: false },
    dataLabels: { enabled: false },
  };
  const growthSeries = [
    { name: "New Users", data: userGrowth.map((d) => Number(d.count)) },
    { name: "New Appointments", data: appointmentTrends.map((d) => Number(d.count)) },
  ];

  // --- Chart: Appointment status donut ---
  const apptStatusMap = { scheduled: 0, completed: 0, cancelled: 0 };
  (appointmentStatusBreakdown || []).forEach((r) => {
    if (apptStatusMap[r.status] !== undefined) apptStatusMap[r.status] = Number(r.count);
  });
  const apptDonutOpts = {
    chart: { fontFamily: CHART_FONT },
    labels: ["Scheduled", "Completed", "Cancelled"],
    colors: ["#0ea5e9", "#10b981", "#f43f5e"],
    legend: { position: "bottom", fontSize: "12px", fontWeight: 600 },
    dataLabels: { enabled: true, style: { fontSize: "12px", fontWeight: 700 } },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: { show: true, label: "Total", fontSize: "13px", fontWeight: 700, color: "#334155",
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString() },
          },
        },
      },
    },
    tooltip: { y: { formatter: (v) => `${v} appointments` } },
  };
  const apptDonutSeries = [apptStatusMap.scheduled, apptStatusMap.completed, apptStatusMap.cancelled];
  const apptDonutHasData = apptDonutSeries.some((v) => v > 0);

  // --- Chart: Role distribution donut ---
  const roleColors = { admin: "#6366f1", user: "#0ea5e9", doctor: "#10b981", hospital: "#f59e0b" };
  const roleLabels = roleDistribution.map((r) => r.role.charAt(0).toUpperCase() + r.role.slice(1));
  const roleDonutOpts = {
    chart: { fontFamily: CHART_FONT },
    labels: roleLabels,
    colors: roleDistribution.map((r) => roleColors[r.role] || "#94a3b8"),
    legend: { position: "bottom", fontSize: "12px", fontWeight: 600 },
    dataLabels: { enabled: true, style: { fontSize: "12px", fontWeight: 700 } },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: { show: true, label: "All Users", fontSize: "13px", fontWeight: 700, color: "#334155",
              formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0).toLocaleString() },
          },
        },
      },
    },
  };
  const roleDonutSeries = roleDistribution.map((r) => Number(r.count));
  const roleDonutHasData = roleDonutSeries.some((v) => v > 0);

  // --- Chart: Request pipeline (stacked bar) ---
  const requestPipelineOpts = {
    chart: { fontFamily: CHART_FONT, toolbar: { show: false }, stacked: true },
    colors: ["#f59e0b", "#10b981", "#f43f5e"],
    xaxis: {
      categories: ["Doctor Requests", "Hospital Requests"],
      labels: { style: { colors: "#64748b", fontSize: "12px", fontWeight: 600 } },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: { labels: { style: { colors: "#94a3b8", fontSize: "11px" } } },
    grid: { borderColor: "#f1f5f9", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 6, columnWidth: "40%" } },
    legend: { position: "top", horizontalAlign: "right", fontSize: "12px", fontWeight: 600 },
    dataLabels: { enabled: false },
    tooltip: { shared: true, intersect: false },
  };

  const getCount = (arr, status) => {
    const found = (arr || []).find((r) => r.status === status);
    return Number(found?.count || 0);
  };

  const requestPipelineSeries = [
    { name: "Pending", data: [getCount(doctorRequestStatus, "pending"), getCount(hospitalRequestStatus, "pending")] },
    { name: "Approved", data: [getCount(doctorRequestStatus, "approved"), getCount(hospitalRequestStatus, "approved")] },
    { name: "Rejected", data: [getCount(doctorRequestStatus, "rejected"), getCount(hospitalRequestStatus, "rejected")] },
  ];

  // --- Top hospitals bar ---
  const maxAppts = topHospitals.length ? Math.max(...topHospitals.map((h) => Number(h.appointment_count))) : 1;

  return (
    <>
      <div className="space-y-6 pb-10">

        {/* ── Summary Cards ── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{card.label}</p>
                  <p className="mt-2 text-3xl font-bold text-slate-900">{card.value}</p>
                </div>
                <div className={`${card.bg} rounded-xl p-2.5`}>
                  <card.icon className={`h-5 w-5 ${card.accent}`} />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {card.trend !== undefined ? (
                  <span className={`flex items-center gap-0.5 text-xs font-semibold ${card.trend >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                    {card.trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {Math.abs(card.trend)}% vs last week
                  </span>
                ) : (
                  <span className="text-xs font-medium text-slate-400">{card.sub}</span>
                )}
                {card.trend !== undefined && (
                  <span className="text-xs text-slate-400">· {card.sub}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* ── Pending Alerts ── */}
        {(Number(summary.pending_doctor_requests) > 0 || Number(summary.pending_hospital_requests) > 0) && (
          <div className="flex flex-wrap gap-3">
            {Number(summary.pending_doctor_requests) > 0 && (
              <button
                onClick={() => navigate("/dashboard/super-admin/requests/doctors")}
                className="flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                <AlertCircle className="h-4 w-4 text-amber-500" />
                {summary.pending_doctor_requests} doctor {Number(summary.pending_doctor_requests) === 1 ? "request" : "requests"} awaiting review
                <ChevronRight className="h-4 w-4 text-amber-400" />
              </button>
            )}
            {Number(summary.pending_hospital_requests) > 0 && (
              <button
                onClick={() => navigate("/dashboard/super-admin/requests/hospitals")}
                className="flex items-center gap-2.5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100"
              >
                <AlertCircle className="h-4 w-4 text-indigo-400" />
                {summary.pending_hospital_requests} hospital {Number(summary.pending_hospital_requests) === 1 ? "request" : "requests"} awaiting review
                <ChevronRight className="h-4 w-4 text-indigo-400" />
              </button>
            )}
          </div>
        )}

        {/* ── Growth Chart (full-width) ── */}
        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-1 flex items-start justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Platform Growth</h3>
              <p className="mt-0.5 text-xs text-slate-400">New user registrations & appointments — last 30 days</p>
            </div>
          </div>
          {growthSeries.some((s) => s.data.some((v) => v > 0))
            ? <Chart options={growthOpts} series={growthSeries} type="area" height={260} />
            : <div className="flex h-64 items-center justify-center text-sm text-slate-400 italic">No activity in the last 30 days</div>
          }
        </div>

        {/* ── 3-Column: Appt Status | Role Dist | Request Pipeline ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-800">Appointment Status</h3>
            {apptDonutHasData
              ? <Chart options={apptDonutOpts} series={apptDonutSeries} type="donut" height={260} />
              : <div className="flex h-64 items-center justify-center text-sm text-slate-400 italic">No appointments yet</div>
            }
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-800">User Distribution</h3>
            {roleDonutHasData
              ? <Chart options={roleDonutOpts} series={roleDonutSeries} type="donut" height={260} />
              : <div className="flex h-64 items-center justify-center text-sm text-slate-400 italic">No users yet</div>
            }
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-slate-800">Request Pipeline</h3>
            {requestPipelineSeries.some((s) => s.data.some((v) => v > 0))
              ? <Chart options={requestPipelineOpts} series={requestPipelineSeries} type="bar" height={260} />
              : <div className="flex h-64 items-center justify-center text-sm text-slate-400 italic">No requests yet</div>
            }
          </div>
        </div>

        {/* ── Bottom: Top Hospitals + Recent Requests ── */}
        <div className="grid gap-5 lg:grid-cols-2">

          {/* Top Hospitals */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <h3 className="mb-5 text-sm font-bold text-slate-800">Top Hospitals by Appointments</h3>
            {topHospitals.length === 0 ? (
              <p className="text-sm text-slate-400 italic">No data yet.</p>
            ) : (
              <div className="space-y-4">
                {topHospitals.map((h, i) => {
                  const count = Number(h.appointment_count);
                  const barW = maxAppts > 0 ? Math.max(4, Math.round((count / maxAppts) * 100)) : 4;
                  return (
                    <div key={h.id}>
                      <div className="mb-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-50 text-[10px] font-bold text-slate-400 border border-slate-100">
                            {i + 1}
                          </span>
                          <span className="text-sm font-semibold text-slate-800 truncate max-w-45" title={h.name}>{h.name}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-500">{count.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all"
                          style={{ width: `${barW}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Requests */}
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Recent Requests</h3>
              <div className="flex gap-2">
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-100">
                  {getCount(doctorRequestStatus, "pending")} dr pending
                </span>
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 border border-indigo-100">
                  {getCount(hospitalRequestStatus, "pending")} hosp pending
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">Doctors</p>
              {recentRequests.doctors.length === 0 ? (
                <p className="text-xs text-slate-400 italic mb-3">No doctor requests.</p>
              ) : (
                recentRequests.doctors.slice(0, 3).map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-emerald-50 p-1.5">
                        <Stethoscope className="h-3.5 w-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{req.full_name}</p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-2.5 w-2.5" />
                          {fmtDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                ))
              )}

              <p className="mb-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Hospitals</p>
              {recentRequests.hospitals.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No hospital requests.</p>
              ) : (
                recentRequests.hospitals.slice(0, 2).map((req) => (
                  <div key={req.id} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-slate-50 transition">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-indigo-50 p-1.5">
                        <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{req.full_name}</p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-2.5 w-2.5" />
                          {fmtDate(req.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(req.status)}`}>
                      {req.status}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                onClick={() => navigate("/dashboard/super-admin/requests/doctors")}
                className="rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
              >
                Doctor Requests
              </button>
              <button
                onClick={() => navigate("/dashboard/super-admin/requests/hospitals")}
                className="rounded-xl border border-slate-200 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Hospital Requests
              </button>
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default AdminDashboard;
