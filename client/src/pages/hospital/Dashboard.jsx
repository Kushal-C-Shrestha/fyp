import React, { useEffect, useState, useMemo } from "react";
import api from "../../api/axios";
import Chart from "react-apexcharts";
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Star,
  UserCheck,
  ChevronRight,
  ArrowUpRight
} from "lucide-react";

const StatsCard = ({ title, value, icon: Icon, colorClass, iconClass, trend }) => (
  <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
      </div>
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colorClass}`}>
        <Icon className={`h-6 w-6 ${iconClass}`} />
      </div>
    </div>
    {trend && (
      <div className="mt-4 flex items-center gap-1.5">
        <span className="flex items-center gap-0.5 text-xs font-semibold text-emerald-600">
          <ArrowUpRight className="h-3 w-3" />
          {trend}%
        </span>
        <span className="text-xs text-slate-400">vs last period</span>
      </div>
    )}
  </div>
);

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/hospitals/me/stats");
        if (data.success) {
          setStats(data.stats);
        }
      } catch (err) {
        setError(err.response?.data?.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const chartOptions = useMemo(() => ({
    chart: {
      toolbar: { show: false },
      fontFamily: 'Inter, sans-serif'
    },
    stroke: { curve: 'smooth', width: 3 },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.45,
        opacityTo: 0.05,
        stops: [20, 100]
      }
    },
    xaxis: {
      categories: stats?.appointmentTrend?.map(d => new Date(d.date).toLocaleDateString([], { weekday: 'short' })) || [],
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: { labels: { show: false } },
    grid: { borderColor: '#f1f5f9', strokeDashArray: 4 },
    colors: ['#059669'],
    tooltip: { x: { show: false } }
  }), [stats]);

  const series = [{
    name: 'Appointments',
    data: stats?.appointmentTrend?.map(d => parseInt(d.count)) || []
  }];

  if (loading) {
    return (
      <>
        <div className="flex h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="space-y-8 pb-10">
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <StatsCard 
            title="Total Doctors" 
            value={stats?.summary?.total_doctors || 0} 
            icon={Users} 
            colorClass="bg-blue-50"
            iconClass="text-blue-600"
          />
          <StatsCard 
            title="Total Appointments" 
            value={stats?.summary?.total_appointments || 0} 
            icon={Calendar} 
            colorClass="bg-emerald-50"
            iconClass="text-emerald-600"
          />
          <StatsCard 
            title="Today's Appointments" 
            value={stats?.summary?.today_appointments || 0} 
            icon={TrendingUp} 
            colorClass="bg-amber-50"
            iconClass="text-amber-600"
          />
          <StatsCard 
            title="Total Reviews" 
            value={stats?.summary?.total_reviews || 0} 
            icon={Star} 
            colorClass="bg-purple-50"
            iconClass="text-purple-600"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Trend Chart */}
          <div className="lg:col-span-2 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Appointment Trends</h3>
              <p className="text-xs text-slate-500">Volume over the last 7 days</p>
            </div>
            <div className="p-4">
              <Chart options={chartOptions} series={series} type="area" height={300} />
            </div>
          </div>

          {/* Top Rated Doctors */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Top Rated Doctors</h3>
              <p className="text-xs text-slate-500">Highest patient satisfaction</p>
            </div>
            <div className="divide-y divide-slate-100">
              {stats?.topRatedDoctors?.length > 0 ? stats.topRatedDoctors.map((doc, idx) => (
                <div key={idx} className="flex items-center gap-3 px-6 py-4 transition hover:bg-slate-50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                    {doc.profile_picture ? (
                      <img src={doc.profile_picture} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <Users className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{doc.full_name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      <span className="text-xs font-medium text-slate-600">{Number(doc.avg_rating).toFixed(1)}</span>
                      <span className="text-[10px] text-slate-400">({doc.review_count})</span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </div>
              )) : (
                <div className="py-10 text-center text-sm text-slate-400">No data available</div>
              )}
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Physician Performance</h3>
              <p className="text-xs text-slate-500">Most booked doctors in the last period</p>
            </div>
            <UserCheck className="h-4 w-4 text-slate-400" />
          </div>
          <div className="p-6">
            {stats?.topBookedDoctors?.length > 0 ? (
              <Chart 
                options={{
                  chart: { toolbar: { show: false }, fontFamily: 'inherit' },
                  plotOptions: {
                    bar: {
                      borderRadius: 6,
                      horizontal: true,
                      barHeight: '60%',
                      distributed: true
                    }
                  },
                  dataLabels: { enabled: true, style: { fontSize: '11px', fontWeight: 'bold' } },
                  colors: ['#10b981', '#3b82f6', '#6366f1', '#f59e0b', '#ef4444'],
                  xaxis: {
                    categories: stats.topBookedDoctors.map(d => d.full_name),
                    labels: { style: { colors: '#64748b' } }
                  },
                  yaxis: {
                    labels: { style: { colors: '#334155', fontWeight: 600 } }
                  },
                  grid: { borderColor: '#f1f5f9' },
                  legend: { show: false }
                }} 
                series={[{
                  name: 'Bookings',
                  data: stats.topBookedDoctors.map(d => parseInt(d.booking_count))
                }]} 
                type="bar" 
                height={280} 
              />
            ) : (
              <div className="py-20 text-center text-sm text-slate-400">No booking data available yet</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
