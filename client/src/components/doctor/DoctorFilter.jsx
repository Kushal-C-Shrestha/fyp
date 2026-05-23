import React, { useState } from 'react';
import {
  RotateCcw,
  Hospital,
  Users,
  Stethoscope,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const GENDER_OPTIONS = ['Male', 'Female'];

const DoctorFilter = ({
  specialities = [],
  hospitals = [],
  filters,
  onFilterChange,
  onReset
}) => {
  const [showAllHosp, setShowAllHosp] = useState(false);
  const [showAllSpec, setShowAllSpec] = useState(false);
  const SPEC_CAP = 6;

  const FilterHeader = ({ icon: Icon, title }) => (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
      <Icon className="h-4 w-4 text-emerald-700" />
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
    </div>
  );

  const handleSpecToggle = (key) => {
    const currentSpecs = Array.isArray(filters.specializationId) ? filters.specializationId : [];
    if (currentSpecs.includes(key)) {
      onFilterChange('specializationId', currentSpecs.filter(id => id !== key));
    } else {
      onFilterChange('specializationId', [...currentSpecs, key]);
    }
  };

  const filterBody = (
    <aside className="glass-card h-full min-h-[calc(100vh-74px)] w-full rounded-none border-0 shadow-none">
      <div className="space-y-5 py-4 pl-8 pr-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">Filters</h3>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-emerald-700 transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div>
          <FilterHeader icon={Stethoscope} title="Specialization" />
          <div className="space-y-3">
            {specialities.length > 0 ? (
              <>
                {(showAllSpec ? specialities : specialities.slice(0, SPEC_CAP)).map((spec) => {
                  const key = spec.id;
                  const label = spec.name;
                  return (
                    <label key={key} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        checked={Array.isArray(filters.specializationId) && filters.specializationId.includes(key)}
                        onChange={() => handleSpecToggle(key)}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-sm text-slate-600">{label}</span>
                    </label>
                  );
                })}
                {specialities.length > SPEC_CAP && (
                  <button
                    type="button"
                    onClick={() => setShowAllSpec(!showAllSpec)}
                    className="flex items-center gap-1 pt-1 text-sm font-medium text-emerald-700 transition hover:text-emerald-800"
                  >
                    {showAllSpec ? (
                      <>See less <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>See more ({specialities.length - SPEC_CAP}) <ChevronDown className="h-4 w-4" /></>
                    )}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">No specializations available.</p>
            )}
          </div>
        </div>

        <div>
          <FilterHeader icon={Hospital} title="Hospitals" />
          <div className="space-y-3">
            {hospitals.length > 0 ? (
              <>
                {(showAllHosp ? hospitals : hospitals.slice(0, 5)).map((hospital) => {
                  return (
                    <label key={hospital.hospital_id} className="flex cursor-pointer items-center gap-3">
                      <input
                        type="radio"
                        name="hospital"
                        checked={String(filters.hospitalId) === String(hospital.hospital_id)}
                        onChange={() => onFilterChange('hospitalId', String(hospital.hospital_id))}
                        className="h-4 w-4 border-slate-300 text-emerald-700 focus:ring-emerald-600"
                      />
                      <span className="text-sm text-slate-600">{hospital.hospital_name}</span>
                    </label>
                  );
                })}
                {hospitals.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllHosp(!showAllHosp)}
                    className="flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition pt-1"
                  >
                    {showAllHosp ? (
                      <>
                        See less <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        See more ({hospitals.length - 5}) <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </button>
                )}
              </>
            ) : (
              <p className="text-sm text-slate-500">No hospitals available.</p>
            )}
          </div>
        </div>

        <div>
          <FilterHeader icon={Users} title="Doctor Gender" />
          <div className="space-y-3">
            {GENDER_OPTIONS.map((label) => (
              <label key={label} className="flex cursor-pointer items-center gap-3">
                <input
                  type="radio"
                  name="gender"
                  checked={filters.gender?.toLowerCase() === label.toLowerCase()}
                  onChange={() => onFilterChange('gender', label.toLowerCase())}
                  className="h-4 w-4 border-slate-300 text-emerald-700 focus:ring-emerald-600"
                />
                <span className="text-sm text-slate-600">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );

  return filterBody;
};

export default DoctorFilter;
