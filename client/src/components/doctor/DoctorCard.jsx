import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, BriefcaseBusiness, Star, MapPin } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import UserAvatar from '../UserAvatar';
import { formatTime } from '../../utils/dateTime.js';

const DoctorCard = ({
  doctor,
  className = '',
  layout = 'vertical',
  showViewButton = true,
  showBookButton = true
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isHorizontal = layout === 'horizontal';
  const shouldOpenDetailsOnCardClick = !showViewButton;

  const formattedRating = `${doctor.rating.toFixed(1)} (${doctor.reviewCount} reviews)`;

  return (
    <div
      className={`glass-card shadow-none overflow-hidden ${isHorizontal ? 'h-auto' : 'h-full'
        } ${shouldOpenDetailsOnCardClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={() => {
        if (shouldOpenDetailsOnCardClick) {
          navigate(`/doctors/${doctor.id}`);
        }
      }}
    >
      <div className={isHorizontal ? 'flex flex-col md:flex-row md:items-stretch' : ''}>
        <div
          className={`relative overflow-hiddenflex items-center justify-center ${isHorizontal ? 'h-40 w-full md:h-44 md:w-44 md:shrink-0' : 'h-40 w-full'
            }`}
        >
          <UserAvatar
            src={doctor.profilePicture}
            name={doctor.name}
            size="h-full w-full"
            className="rounded-none border-none ring-0"
          />
        </div>

        <div
          className={`p-4 ${isHorizontal
            ? 'flex flex-1 flex-col gap-4 md:flex-row md:items-start md:justify-between'
            : ''
            }`}
        >
          <div className="min-w-0 flex-1">
            {isHorizontal ? (
              <>
                <h3 className="truncate text-lg font-bold text-slate-900">
                  {doctor.name}
                </h3>

                <p className="mt-1 text-sm font-medium text-emerald-700">
                  {doctor.specialization}
                </p>

                <div className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-600">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />

                  <span className="truncate">
                    {doctor.hospitalTimings.length > 0
                      ? doctor.hospitalTimings.map((item, index) => (
                        <span key={`${item.hospital_id}-${index}`}>
                          <span className="font-medium text-slate-800">
                            {item.hospital_name}
                          </span>
                          {formatTime(item.start_time) ? ` (${formatTime(item.start_time)} - ${formatTime(item.end_time)})` : ''}
                          {index < doctor.hospitalTimings.length - 1 ? ', ' : ''}
                        </span>
                      ))
                      : doctor.hospitalName || 'Hospital unavailable'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">
                      {doctor.address || 'Address not specified'} •{' '}
                      <span className="font-semibold text-emerald-700">
                        Fee: Rs {Number(doctor.consultationFee || 0).toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 text-sm text-slate-600 sm:grid-cols-2">
                  <p className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      <span className="font-medium text-slate-800">Experience:</span>{' '}
                      {doctor.experienceYears > 0 ? `${doctor.experienceYears} yrs` : '-'}
                    </span>
                  </p>

                  <p className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      <span className="font-medium text-slate-800">Rating:</span>{' '}
                      {formattedRating}
                    </span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-emerald-700">
                  {doctor.specialization}
                </p>

                <h3 className="mt-1 truncate text-base font-bold text-slate-900">
                  {doctor.name}
                </h3>

                <div className="mt-2.5 flex items-center gap-1.5 text-sm text-slate-600">
                  <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-500" />

                  <span className="truncate">
                    {doctor.hospitalTimings.length > 0
                      ? doctor.hospitalTimings.map((item, index) => (
                        <span key={`${item.hospital_id}-${index}`}>
                          <span className="font-medium text-slate-800">
                            {item.hospital_name}
                          </span>
                          {formatTime(item.start_time) ? ` (${formatTime(item.start_time)} - ${formatTime(item.end_time)})` : ''}
                          {index < doctor.hospitalTimings.length - 1 ? ', ' : ''}
                        </span>
                      ))
                      : doctor.hospitalName || 'Hospital unavailable'}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center gap-3 text-sm text-slate-600">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                    <span className="truncate">
                      {doctor.address || 'Address not specified'} •{' '}
                      <span className="font-semibold text-emerald-700 text-xs">
                        Fee: Rs {Number(doctor.consultationFee || 0).toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-sm text-slate-600">
                  <p className="inline-flex items-center gap-1.5">
                    <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      <span className="font-medium text-slate-800">Experience:</span>{' '}
                      {doctor.experienceYears > 0 ? `${doctor.experienceYears} yrs` : '-'}
                    </span>
                  </p>

                  <p className="inline-flex items-center gap-1.5">
                    <Star className="h-3.5 w-3.5 text-amber-500" />
                    <span>
                      <span className="font-medium text-slate-800">Rating:</span>{' '}
                      {formattedRating}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>

          {(showViewButton || showBookButton) && (
            <div
              className={`${isHorizontal
                ? showViewButton
                  ? 'flex gap-2 md:w-[220px] md:shrink-0 md:self-center'
                  : 'flex md:w-36 md:shrink-0 md:self-center'
                : 'mt-4 grid grid-cols-2 gap-2'
                }`}
            >
              {showViewButton && (
                <button
                  className={`rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold transition hover:bg-slate-50 ${isHorizontal ? 'flex-1' : ''
                    }`}
                  onClick={() => navigate(`/doctors/${doctor.id}`)}
                >
                  View Profile
                </button>
              )}

              {showBookButton && (
                <button
                  className={`rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-800 ${isHorizontal ? 'flex-1' : ''
                    }`}
                  onClick={() =>
                    navigate(
                      user ? `/doctors/${doctor.id}/book-appointment` : '/login',
                      { state: { doctor } }
                    )
                  }
                >
                  Book Appointment
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorCard;