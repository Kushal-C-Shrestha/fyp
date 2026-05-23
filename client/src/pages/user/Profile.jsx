import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const Profile = () => {
  const { user } = useAuth();

  const displayName = user?.name || user?.user_name || 'User';
  const displayEmail = user?.email || user?.user_email || 'Not provided';
  const displayPhone = user?.phone || user?.user_phone || 'Not provided';
  const displayRole = user?.role || user?.role_name || 'User';
  const displayAddress = user?.address || user?.user_address || 'Not provided';
  const profileImage = user?.user_profile_picture || user?.profile_picture || user?.user_profile || user?.profile || '';

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{displayName}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Role</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{displayRole}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Email</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{displayEmail}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{displayPhone}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Address</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{displayAddress}</p>
        </div>
      </div>
      {profileImage ? null : (
        <p className="mt-4 text-xs text-slate-500">No profile photo uploaded yet.</p>
      )}
    </>
  );
};

export default Profile;

