import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, MapPin } from 'lucide-react';

const HospitalCard = ({ hospital, className = '' }) => {
  const navigate = useNavigate();

  const hospitalId = hospital.hospital_id || hospital.id;
  const hospitalName = hospital.hospital_name || hospital.name || 'Hospital';
  const hospitalType = hospital.hospital_type || hospital.type || 'Hospital';
  const hospitalAddress = hospital.hospital_address || hospital.location || 'Address unavailable';
  const hospitalImage = hospital.hospital_image || hospital.image || '';
  const departments = Array.isArray(hospital.departments) ? hospital.departments : (Array.isArray(hospital.features) ? hospital.features : []);

  return (
    <article className={`h-full overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}>
      <div className="relative h-44 w-full overflow-hidden bg-slate-100">
        {hospitalImage ? (
          <img src={hospitalImage} alt={hospitalName} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-50">
            <Building2 className="h-12 w-12 text-slate-200" />
          </div>
        )}
      </div>

      <div className="flex min-h-[220px] flex-col p-4">
        <p className="text-xs font-semibold text-emerald-700">{hospitalType}</p>
        <h3 className="mt-1 line-clamp-2 text-base font-bold text-slate-900">{hospitalName}</h3>

        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5" />
          <span className="line-clamp-1">{hospitalAddress}</span>
        </p>

        <div className="mt-3 min-h-[30px]">
          <div className="flex flex-wrap gap-1.5">
            {departments.slice(0, 2).map((dep) => (
              <span key={`${hospitalId}-${dep}`} className="rounded-md border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600">
                {dep}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
          <button
            onClick={() => navigate(`/hospitals/${hospitalId}`)}
            className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            View
          </button>
          <button
            onClick={() => navigate(`/doctors?hospital=${hospitalId}`)}
            className="rounded-lg bg-emerald-700 px-3 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-800"
          >
            Find Doctor
          </button>
        </div>
      </div>
    </article>
  );
};

export default HospitalCard;
