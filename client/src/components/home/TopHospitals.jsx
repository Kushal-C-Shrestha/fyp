import React, { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import HospitalCard from '../hospital/HospitalCard';
import api from '../../api/axios';

const TopHospitals = () => {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHospitals = async () => {
      try {
        const { data } = await api.get('/hospitals');
        setHospitals(Array.isArray(data?.hospitals) ? data.hospitals.slice(0, 3) : []);
      } catch (error) {
        console.error('Failed to load top hospitals:', error);
        setHospitals([]);
      } finally {
        setLoading(false);
      }
    };

    loadHospitals();
  }, []);

  return (
    <section className="bg-slate-50 py-20">
      <div className="page-shell">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Top Hospitals</p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Best care centers</h2>
        </div>

        {loading ? (
          <p className="text-center text-sm text-slate-500">Loading hospitals...</p>
        ) : hospitals.length > 0 ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {hospitals.map((hospital) => (
              <HospitalCard key={hospital.hospital_id || hospital.id} hospital={hospital} />
            ))}
          </div>
        ) : (
          <p className="text-center text-sm text-slate-500">No hospitals available right now.</p>
        )}

        <div className="mt-10 flex justify-center">
          <button
            onClick={() => navigate('/hospitals')}
            className="group inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
          >
            View All Hospitals
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default TopHospitals;


