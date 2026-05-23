import React, { useEffect, useMemo, useRef, useState } from "react";
import { CalendarCheck2, Clock3, Stethoscope, TrendingDown, TrendingUp, User } from "lucide-react";
import { Link } from "react-router-dom";
import ReactCalendar from "react-calendar";
import ReactApexChart from "react-apexcharts";
import { useAuth } from "../../hooks/useAuth";
import api from "../../api/axios";
import "react-calendar/dist/Calendar.css";
import "./DashboardCalendar.css";

const normalizeStatus = (status) => {
  const raw = String(status || "").toLowerCase();
  if (raw === "completed") return "completed";
  if (raw === "cancelled") return "cancelled";
  return "pending";
};

const getDateKey = (value) => {
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return `${match[1]}-${match[2]}-${match[3]}`;
    }
    const matchDT = value.split('T')[0].match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (matchDT) {
      return `${matchDT[1]}-${matchDT[2]}-${matchDT[3]}`;
    }
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
};

const normalizeSlotTimeLabel = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const match = raw.match(/(\d{1,2}):(\d{2})/);
  if (!match) return "";

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};

const formatSlotTimeLabel = (value) => {
  const [hourRaw, minuteRaw] = String(value || "").split(":");
  const hour = Number.parseInt(hourRaw, 10);
  const minute = Number.parseInt(minuteRaw, 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return String(value || "");
  return `${hour}:${String(minute).padStart(2, "0")}`;
};

const getAppointmentMode = (appointment) => {
  const explicitMode = String(
    appointment?.appointment_type || appointment?.appointment_mode || appointment?.consultation_type || appointment?.mode || ""
  ).toLowerCase();

  if (/(online|virtual|video|tele)/.test(explicitMode)) return "online";
  if (/(physical|in[- ]?person|offline|clinic|hospital)/.test(explicitMode)) return "physical";

  const notes = String(appointment?.appointment_notes || appointment?.notes || "").toLowerCase();
  if (/consultation type:\s*online/.test(notes)) return "online";
  if (/consultation type:\s*(physical|in[- ]?person)/.test(notes)) return "physical";
  if (/\bonline\b/.test(notes)) return "online";
  if (/\b(physical|in[- ]?person)\b/.test(notes)) return "physical";

  return "physical";
};

const calculateTrendPercent = (current, previous) => {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return 0;
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const formatPercent = (value) => `${Math.abs(value).toLocaleString([], { maximumFractionDigits: 1 })}%`;

const MetricCard = ({ icon: Icon, label, value, loading, trendPercent, iconTone = "emerald" }) => {
  const hasTrend = typeof trendPercent === "number";
  const isUp = hasTrend ? trendPercent >= 0 : true;
  const TrendIcon = isUp ? TrendingUp : TrendingDown;
  const trendClassName = loading ? "text-slate-400" : isUp ? "text-emerald-600" : "text-rose-600";
  const iconToneClassName = {
    emerald: "bg-emerald-100 text-emerald-700",
    cyan: "bg-cyan-100 text-cyan-700",
    slate: "bg-slate-200 text-slate-700",
    amber: "bg-amber-100 text-amber-700",
  }[iconTone];

  return (
    <div className="h-full rounded-xl bg-white p-4">
      <div className="flex items-center gap-3">
        <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconToneClassName}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Appointments</p>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
        </div>
      </div>
      <div className={`mt-4 flex items-end ${hasTrend ? "justify-between gap-3" : ""}`}>
        <p className="text-3xl font-bold leading-none tabular-nums text-slate-900">{loading ? "-" : value}</p>
        {hasTrend ? (
          <div className={`inline-flex items-center gap-1 text-sm font-semibold ${trendClassName}`}>
            {!loading ? <TrendIcon className="h-4 w-4" /> : null}
            <span>{loading ? "-" : formatPercent(trendPercent)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
};

const MonthCalendarCard = ({ appointmentStatsByDate, className = "" }) => {
  const [activeMonth, setActiveMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [hoverTooltip, setHoverTooltip] = useState(null);
  const calendarCardRef = useRef(null);

  const showTooltip = (event, payload) => {
    const wrapper = calendarCardRef.current;
    if (!wrapper) return;
    const wrapperRect = wrapper.getBoundingClientRect();
    const tileRect = event.currentTarget.getBoundingClientRect();

    setHoverTooltip({
      ...payload,
      left: tileRect.left - wrapperRect.left + tileRect.width / 2,
      top: tileRect.top - wrapperRect.top - 6,
    });
  };

  return (
    <div ref={calendarCardRef} className={`relative h-full rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      {hoverTooltip ? (
        <div
          className="doctor-month-calendar__panel-tooltip"
          style={{ left: `${hoverTooltip.left}px`, top: `${hoverTooltip.top}px` }}
        >
          <span className="doctor-month-calendar__tooltip-title">{hoverTooltip.dateLabel}</span>
          <span>{hoverTooltip.count} booked</span>
          <span>Physical: {hoverTooltip.physical}</span>
          <span>Online: {hoverTooltip.online}</span>
        </div>
      ) : null}
      <ReactCalendar
        className="doctor-month-calendar"
        activeStartDate={activeMonth}
        minDetail="month"
        maxDetail="month"
        next2Label={null}
        prev2Label={null}
        showNeighboringMonth={false}
        formatShortWeekday={(_, date) => date.toLocaleDateString([], { weekday: "narrow" })}
        onActiveStartDateChange={({ activeStartDate, view }) => {
          if (view === "month" && activeStartDate) {
            setActiveMonth(new Date(activeStartDate.getFullYear(), activeStartDate.getMonth(), 1));
            setHoverTooltip(null);
          }
        }}
        tileClassName={({ date, view }) => {
          if (view !== "month") return "";
          const key = getDateKey(date);
          const hasAppointments = (appointmentStatsByDate.get(key)?.total || 0) > 0;
          const isToday = key === getDateKey(new Date());
          return `${hasAppointments ? "has-appointments" : ""} ${isToday ? "is-today" : ""}`.trim();
        }}
        tileContent={({ date, view }) => {
          if (view !== "month") return null;
          const key = getDateKey(date);
          const stats = appointmentStatsByDate.get(key);
          const count = stats?.total || 0;
          const payload = {
            dateLabel: date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }),
            count,
            physical: stats?.physical || 0,
            online: stats?.online || 0,
          };

          return (
            <>
              {count ? <span className="doctor-month-calendar__count">{count}</span> : null}
              <span
                className="doctor-month-calendar__hover-target"
                onMouseEnter={(event) => showTooltip(event, payload)}
                onMouseMove={(event) => showTooltip(event, payload)}
                onMouseLeave={() => setHoverTooltip(null)}
              />
            </>
          );
        }}
      />
    </div>
  );
};

const Dashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setLoading(true);

        const appointmentsRes = await api.get("/appointments");

        const appointmentList = Array.isArray(appointmentsRes?.data?.appointments) ? appointmentsRes.data.appointments : [];
        setAppointments(appointmentList);

        const selfDoctorId = Number(user?.id);
        if (Number.isInteger(selfDoctorId) && selfDoctorId > 0) {
          const reviewsRes = await api.get(`/doctors/${selfDoctorId}/reviews`);
          setReviews(Array.isArray(reviewsRes?.data?.reviews) ? reviewsRes.data.reviews : []);
        } else {
          setReviews([]);
        }
      } catch {
        setAppointments([]);
        setReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.id]);

  const appointmentStatsByDate = useMemo(() => {
    const byDate = new Map();
    appointments.forEach((item) => {
      const key = getDateKey(item.appointment_date);
      if (!key) return;
      const mode = getAppointmentMode(item);
      const currentStats = byDate.get(key) || { total: 0, physical: 0, online: 0 };
      const nextStats = { ...currentStats, total: currentStats.total + 1 };
      if (mode === "online") {
        nextStats.online += 1;
      } else {
        nextStats.physical += 1;
      }
      byDate.set(key, nextStats);
    });
    return byDate;
  }, [appointments]);

  const appointmentCountByDate = useMemo(() => {
    const byDate = new Map();
    appointmentStatsByDate.forEach((stats, key) => {
      byDate.set(key, stats.total || 0);
    });
    return byDate;
  }, [appointmentStatsByDate]);

  const metrics = useMemo(() => {
    const todayKey = getDateKey(new Date());
    const todaysAppointments = appointmentCountByDate.get(todayKey) || 0;
    const pendingAppointments = appointments.filter((item) => normalizeStatus(item.appointment_status) === "pending");
    const onlineAppointments = appointments.filter((item) => getAppointmentMode(item) === "online");
    const physicalAppointments = appointments.length - onlineAppointments.length;

    const now = new Date();
    const weekStart = new Date(now);
    const dayIndex = weekStart.getDay();
    const diffToMonday = (dayIndex + 6) % 7;
    weekStart.setDate(weekStart.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);

    const weekKeys = Array.from({ length: 7 }).map((_, index) => {
      const current = new Date(weekStart);
      current.setDate(weekStart.getDate() + index);
      return getDateKey(current);
    });
    const previousWeekStart = new Date(weekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekKeys = Array.from({ length: 7 }).map((_, index) => {
      const current = new Date(previousWeekStart);
      current.setDate(previousWeekStart.getDate() + index);
      return getDateKey(current);
    });

    const thisWeekAppointments = weekKeys.reduce((sum, key) => sum + (appointmentCountByDate.get(key) || 0), 0);
    const lastWeekAppointments = previousWeekKeys.reduce((sum, key) => sum + (appointmentCountByDate.get(key) || 0), 0);

    const todayLastWeek = new Date();
    todayLastWeek.setDate(todayLastWeek.getDate() - 7);
    const todayLastWeekCount = appointmentCountByDate.get(getDateKey(todayLastWeek)) || 0;

    const trendDays = Array.from({ length: 7 }).map((_, index) => {
      const current = new Date();
      current.setDate(current.getDate() - (6 - index));
      return current;
    });
    const appointmentsTrendLabels = trendDays.map((date) => date.toLocaleDateString([], { weekday: "short" }));
    const appointmentsTrendValues = trendDays.map((date) => appointmentCountByDate.get(getDateKey(date)) || 0);

    return {
      todaysAppointments,
      thisWeekAppointments,
      totalAppointments: appointments.length,
      pendingAppointments: pendingAppointments.length,
      onlineAppointments: onlineAppointments.length,
      physicalAppointments,
      todayTrendPercent: calculateTrendPercent(todaysAppointments, todayLastWeekCount),
      weekTrendPercent: calculateTrendPercent(thisWeekAppointments, lastWeekAppointments),
      appointmentsTrendLabels,
      appointmentsTrendValues,
    };
  }, [appointments, appointmentCountByDate]);

  const appointmentsLineChart = useMemo(
    () => ({
      series: [
        {
          name: "Appointments",
          data: metrics.appointmentsTrendValues,
        },
      ],
      options: {
        chart: {
          id: "doctor-appointments-trend",
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { easing: "easeinout", speed: 450 },
        },
        stroke: {
          curve: "smooth",
          width: 3,
        },
        colors: ["#10b981"],
        dataLabels: { enabled: false },
        grid: {
          borderColor: "#e2e8f0",
          strokeDashArray: 4,
        },
        markers: {
          size: 4,
          colors: ["#10b981"],
          strokeColors: "#ffffff",
          strokeWidth: 2,
          hover: { size: 6 },
        },
        xaxis: {
          categories: metrics.appointmentsTrendLabels,
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          decimalsInFloat: 0,
          labels: {
            formatter: (value) => String(Math.round(value)),
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
        },
        tooltip: {
          theme: "light",
          y: {
            formatter: (value) => `${Math.round(value)} appointments`,
          },
        },
        legend: { show: false },
      },
    }),
    [metrics.appointmentsTrendLabels, metrics.appointmentsTrendValues]
  );

  const reviewMetrics = useMemo(() => {
    const ratingBuckets = [1, 2, 3, 4, 5].map((rating) =>
      reviews.filter((review) => Math.round(Number(review?.rating || 0)) === rating).length
    );
    const ratingBreakdown = [5, 4, 3, 2, 1].map((stars) => ({
      stars,
      count: ratingBuckets[stars - 1],
    }));
    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0 ? reviews.reduce((sum, review) => sum + Number(review?.rating || 0), 0) / totalReviews : 0;
    const maxBucket = Math.max(...ratingBreakdown.map((item) => item.count), 1);

    return {
      totalReviews,
      averageRating,
      ratingBreakdown,
      maxBucket,
    };
  }, [reviews]);

  const recentReviews = useMemo(
    () =>
      [...reviews]
        .sort((a, b) => new Date(b?.created_at || 0).getTime() - new Date(a?.created_at || 0).getTime())
        .slice(0, 4),
    [reviews]
  );

  const appointmentModeChart = useMemo(
    () => ({
      series: [
        {
          name: "Appointments",
          data: [metrics.physicalAppointments, metrics.onlineAppointments],
        },
      ],
      options: {
        chart: {
          id: "doctor-appointment-mode",
          toolbar: { show: false },
        },
        plotOptions: {
          bar: {
            borderRadius: 0,
            columnWidth: "48%",
          },
        },
        colors: ["#0ea5e9"],
        dataLabels: {
          enabled: true,
          formatter: (value) => `${Math.round(value)}`,
        },
        grid: {
          borderColor: "#e2e8f0",
          strokeDashArray: 4,
        },
        xaxis: {
          categories: ["Physical", "Online"],
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          decimalsInFloat: 0,
          labels: {
            formatter: (value) => String(Math.round(value)),
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
        },
        legend: { show: false },
        tooltip: {
          y: {
            formatter: (value) => `${Math.round(value)} appointments`,
          },
        },
      },
    }),
    [metrics.physicalAppointments, metrics.onlineAppointments]
  );

  const appointmentPatternMetrics = useMemo(() => {
    const slotMap = new Map();
    const weekdayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const weekdayMap = new Map(weekdayOrder.map((day) => [day, 0]));

    appointments.forEach((item) => {
      const slotLabel = normalizeSlotTimeLabel(item?.appointment_time || item?.slot_start_time || item?.slot_time);
      if (slotLabel) {
        slotMap.set(slotLabel, (slotMap.get(slotLabel) || 0) + 1);
      }

      const date = new Date(item?.appointment_date);
      if (!Number.isNaN(date.getTime())) {
        const weekday = date.toLocaleDateString([], { weekday: "short" });
        if (weekdayMap.has(weekday)) {
          weekdayMap.set(weekday, (weekdayMap.get(weekday) || 0) + 1);
        }
      }
    });

    const topPeakSlots = Array.from(slotMap.entries())
      .map(([slot, count]) => ({ slot, count }))
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.slot.localeCompare(b.slot);
      })
      .slice(0, 5)
      .sort((a, b) => a.slot.localeCompare(b.slot));

    return {
      peakSlots: topPeakSlots.map((item) => ({
        label: formatSlotTimeLabel(item.slot),
        count: item.count,
      })),
      weekdayLabels: weekdayOrder,
      weekdayValues: weekdayOrder.map((day) => weekdayMap.get(day) || 0),
    };
  }, [appointments]);

  const peakTimeChart = useMemo(
    () => ({
      series: [
        {
          name: "Appointments",
          data: appointmentPatternMetrics.peakSlots.map((item) => ({
            x: item.label,
            y: item.count,
          })),
        },
      ],
      options: {
        chart: {
          id: "doctor-peak-time",
          toolbar: { show: false },
        },
        plotOptions: {
          bar: {
            borderRadius: 0,
            columnWidth: "48%",
          },
        },
        colors: ["#14b8a6"],
        dataLabels: {
          enabled: true,
          formatter: (value) => `${Math.round(value)}`,
        },
        grid: {
          borderColor: "#e2e8f0",
          strokeDashArray: 4,
        },
        xaxis: {
          type: "category",
          labels: {
            formatter: (value) => String(value),
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          decimalsInFloat: 0,
          labels: {
            formatter: (value) => String(Math.round(value)),
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
        },
        legend: { show: false },
        tooltip: {
          y: {
            formatter: (value) => `${Math.round(value)} appointments`,
          },
        },
      },
    }),
    [appointmentPatternMetrics.peakSlots]
  );

  const weekdayLoadChart = useMemo(
    () => ({
      series: [
        {
          name: "Appointments",
          data: appointmentPatternMetrics.weekdayValues,
        },
      ],
      options: {
        chart: {
          id: "doctor-weekday-load",
          toolbar: { show: false },
        },
        plotOptions: {
          bar: {
            borderRadius: 0,
            columnWidth: "52%",
          },
        },
        colors: ["#06b6d4"],
        dataLabels: {
          enabled: true,
          formatter: (value) => `${Math.round(value)}`,
        },
        grid: {
          borderColor: "#e2e8f0",
          strokeDashArray: 4,
        },
        xaxis: {
          categories: appointmentPatternMetrics.weekdayLabels,
          labels: {
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          forceNiceScale: true,
          decimalsInFloat: 0,
          labels: {
            formatter: (value) => String(Math.round(value)),
            style: {
              colors: "#64748b",
              fontSize: "11px",
            },
          },
        },
        legend: { show: false },
        tooltip: {
          y: {
            formatter: (value) => `${Math.round(value)} appointments`,
          },
        },
      },
    }),
    [appointmentPatternMetrics.weekdayLabels, appointmentPatternMetrics.weekdayValues]
  );

  return (
    <>
      <div className="space-y-6">
        <div className="grid auto-rows-fr gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Stethoscope}
            label="Today"
            value={metrics.todaysAppointments}
            loading={loading}
            trendPercent={metrics.todayTrendPercent}
            iconTone="emerald"
          />
          <MetricCard
            icon={CalendarCheck2}
            label="This Week"
            value={metrics.thisWeekAppointments}
            loading={loading}
            trendPercent={metrics.weekTrendPercent}
            iconTone="cyan"
          />
          <MetricCard
            icon={User}
            label="Total"
            value={metrics.totalAppointments}
            loading={loading}
            iconTone="slate"
          />
          <MetricCard
            icon={Clock3}
            label="Pending"
            value={metrics.pendingAppointments}
            loading={loading}
            iconTone="amber"
          />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="h-full rounded-xl border border-slate-200 bg-white p-4 xl:h-[370px]">
            <div>
              <p className="text-base font-semibold text-slate-900">Appointments Trend</p>
              <p className="mt-1 text-xs text-slate-500">Daily totals over the last 7 days</p>
            </div>
            <div className="mt-5 h-[220px]">
              <ReactApexChart type="line" options={appointmentsLineChart.options} series={appointmentsLineChart.series} height="100%" />
            </div>
          </div>

          <MonthCalendarCard
            appointmentStatsByDate={appointmentStatsByDate}
            className="mx-auto w-full max-w-[360px] bg-white xl:mx-0 xl:h-[370px] xl:max-w-[360px] xl:justify-self-end"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 xl:col-span-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-slate-900">Reviews</p>
                <p className="mt-1 text-xs text-slate-500">Rating breakdown and recent patient feedback</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900">
                  {loading ? "-" : reviewMetrics.averageRating.toLocaleString([], { maximumFractionDigits: 1 })} / 5
                </p>
                <p className="text-xs text-slate-500">{loading ? "-" : `${reviewMetrics.totalReviews} reviews`}</p>
                <Link
                  to="/dashboard/doctor/reviews"
                  className="mt-2 inline-block text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                >
                  See more
                </Link>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="space-y-4">
                  {reviewMetrics.ratingBreakdown.map((item) => (
                    <div key={item.stars} className="grid grid-cols-[44px_minmax(0,1fr)_30px] items-center gap-3">
                      <span className="text-xs font-semibold text-slate-700">{item.stars}</span>
                      <div className="h-3.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-3.5 rounded-full bg-cyan-500"
                          style={{ width: `${(item.count / reviewMetrics.maxBucket) * 100}%` }}
                        />
                      </div>
                      <span className="text-right text-sm font-semibold text-slate-700">{loading ? "-" : item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <p className="text-sm text-slate-500">Loading reviews...</p>
                ) : recentReviews.length > 0 ? (
                  recentReviews.map((review) => (
                    <article key={review.review_id} className="rounded-lg border border-slate-200 bg-white p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-semibold text-slate-900">{review.reviewer_name || "Patient"}</p>
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          {Number(review.rating || 0).toFixed(1)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs text-slate-600">{review.comment || "No comment provided."}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                    No reviews available yet.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 xl:h-[360px]">
            <p className="text-base font-semibold text-slate-900">Consultation Mode</p>
            <p className="mt-1 text-xs text-slate-500">Physical vs online appointments</p>
            <div className="mt-5 h-[220px]">
              <ReactApexChart
                type="bar"
                options={appointmentModeChart.options}
                series={appointmentModeChart.series}
                height="100%"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-base font-semibold text-slate-900">Peak Appointment Time</p>
            <p className="mt-1 text-xs text-slate-500">Most booked time slots</p>
            <div className="mt-5 h-[250px]">
              <ReactApexChart type="bar" options={peakTimeChart.options} series={peakTimeChart.series} height="100%" />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-base font-semibold text-slate-900">Appointments by Weekday</p>
            <p className="mt-1 text-xs text-slate-500">Day-wise booking distribution</p>
            <div className="mt-5 h-[250px]">
              <ReactApexChart type="bar" options={weekdayLoadChart.options} series={weekdayLoadChart.series} height="100%" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
