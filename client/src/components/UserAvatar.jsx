import React from 'react';
import { User } from 'lucide-react';

const UserAvatar = ({ src, name, size = 'h-8 w-8', className = '' }) => {
  const [error, setError] = React.useState(false);

  // If we have a valid src and no error, show the image
  if (src && !error) {
    return (
      <img
        src={src}
        alt={name || 'User profile'}
        className={`${size} rounded-full object-cover ring-1 ring-slate-100 ${className}`}
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-400 ${className}`}
      title={name || 'User profile'}
    >
      <User className="h-1/2 w-1/2 stroke-[2]" />
    </div>
  );
};

export default UserAvatar;
