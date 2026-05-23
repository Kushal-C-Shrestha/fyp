import React, { useState } from 'react';
import { RotateCcw, Hospital, Stethoscope, ChevronDown, ChevronUp, X } from 'lucide-react';

const HospitalFilter = ({
  filters,
  handleRadioChange,
  handleCheckboxChange,
  clearFilters,
  hospitalTypes = [],
  departments = [],
  isOpen = false,
  onClose = () => {},
}) => {
  const [showAllTypes, setShowAllTypes] = useState(false);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const remainingTypesCount = Math.max((hospitalTypes?.length || 0) - 5, 0);
  const remainingDepartmentsCount = Math.max((departments?.length || 0) - 5, 0);

  const FilterHeader = ({ icon: Icon, title }) => (
    <div className="mb-3 flex items-center gap-2 border-b border-slate-100 pb-2">
      <Icon className="h-4 w-4 text-emerald-700" />
      <h4 className="text-sm font-bold text-slate-800">{title}</h4>
    </div>
  );

  const filterBody = (
    <aside className="glass-card h-full min-h-[calc(100vh-74px)] w-full rounded-none border-0 shadow-none">
      <div className="space-y-5 py-4 pl-8 pr-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900">Filters</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 transition-colors hover:text-emerald-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button onClick={onClose} className="rounded-lg border border-slate-200 p-1.5 text-slate-500 lg:hidden">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div>
          <FilterHeader icon={Hospital} title="Hospital Type" />
          <div className="space-y-3">
            {(showAllTypes ? hospitalTypes : hospitalTypes.slice(0, 5)).map((type) => (
              <label key={type} className="group flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.types.includes(type)}
                  onChange={() => handleCheckboxChange('types', type)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                />
                <span className={`text-sm ${filters.types.includes(type) ? 'font-bold text-emerald-700' : 'text-slate-500 group-hover:text-slate-800'}`}>
                  {type}
                </span>
              </label>
            ))}
            {hospitalTypes.length > 5 && (
              <button onClick={() => setShowAllTypes(!showAllTypes)} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                {showAllTypes ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> See Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> See More ({remainingTypesCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div>
          <FilterHeader icon={Stethoscope} title="Departments" />
          <div className="space-y-3">
            {(showAllDepartments ? departments : departments.slice(0, 5)).map((department) => (
              <label key={department} className="group flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={filters.departments.includes(department)}
                  onChange={() => handleCheckboxChange('departments', department)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500"
                />
                <span className={`text-sm ${filters.departments.includes(department) ? 'font-bold text-emerald-700' : 'text-slate-500 group-hover:text-slate-800'}`}>
                  {department}
                </span>
              </label>
            ))}
            {departments.length > 5 && (
              <button onClick={() => setShowAllDepartments(!showAllDepartments)} className="flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline">
                {showAllDepartments ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5" /> See Less
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5" /> See More ({remainingDepartmentsCount})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );

  return (
    <>
      <div className="hidden h-full w-full lg:block">{filterBody}</div>
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/45 p-4 lg:hidden">
          <div className="h-full w-full">{filterBody}</div>
        </div>
      )}
    </>
  );
};

export default HospitalFilter;
