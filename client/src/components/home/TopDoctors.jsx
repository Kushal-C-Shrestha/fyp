import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import DoctorCard from '../doctor/DoctorCard';
import api from '../../api/axios';

const TopDoctors = () => {
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDoctors = async () => {
      try {
        const { data } = await api.get('/doctors');
        setDoctors(Array.isArray(data?.doctors) ? data.doctors.slice(0, 4) : []);
      } catch (error) {
        console.error('Failed to load top doctors:', error);
        setDoctors([]);
      } finally {
        setLoading(false);
      }
    };

    loadDoctors();
  }, []);

  return (
    <section className="bg-white py-20">
      <div className="page-shell">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Top Doctors</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Trusted specialists</h2>
        </div>

        {loading ? (
          <p className="text-center text-sm text-slate-500">Loading doctors...</p>
        ) : doctors.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((doc) => (
              <DoctorCard key={doc.user_id || doc.id} doctor={doc} />
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500">No doctors available right now.</p>
        )}

        <div className="mt-10 flex justify-center">
          <button
            onClick={() => navigate('/doctors')}
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            View All Doctors
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default TopDoctors;


