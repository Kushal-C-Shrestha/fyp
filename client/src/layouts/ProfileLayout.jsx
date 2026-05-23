import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  Bell,
  BookOpenText,
  CalendarCheck2,
  FileText,
  LogOut,
  MessageSquareText,
  Settings,
} from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { to: '/profile/appointments', icon: CalendarCheck2, label: 'Appointments' },
  { to: '/profile/medical-records', icon: FileText, label: 'Medical Records' },
  { to: '/profile/blogs', icon: BookOpenText, label: 'Blogs' },
  { to: '/profile/reviews', icon: MessageSquareText, label: 'Reviews' },
  { to: '/profile/notifications', icon: Bell, label: 'Notifications' },
  { to: '/profile/settings', icon: Settings, label: 'Settings' },
];

const PROFILE_HEADER_MAP = {
  '/profile/appointments': { title: 'Appointments', description: 'Pending and completed appointments.' },
  '/profile/medical-records': { title: 'Medical Records', description: 'Keep your medical history in one place.' },
  '/profile/blogs': { title: 'Blogs', description: 'Write health blogs, track approval status, and manage your published posts.' },
  '/profile/reviews': { title: 'Reviews', description: 'See all reviews you have written and manage feedback.' },
  '/profile/notifications': { title: 'Notifications', description: 'A simple inbox for updates that matter to your account.' },
  '/profile/settings': { title: 'Settings', description: 'Manage your personal information, contact info, and security preferences.' },
};

const ProfileLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (!user) {
    return (
      <>
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 pb-16 pt-28 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <h1 className="text-2xl font-bold text-slate-900">You are not logged in</h1>
            <p className="mt-2 text-sm text-slate-600">Please login to view profile pages.</p>
            <NavLink
              to="/login"
              className="mt-6 inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
            >
              Go to Login
            </NavLink>
          </div>
        </main>
      </>
    );
  }

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const headerInfo = PROFILE_HEADER_MAP[location.pathname] || {
    title: 'Profile Overview',
    description: 'Your account summary and personal details.',
  };

  return (
    <>
      <Navbar />
      <main className="h-[calc(100vh-74px)] overflow-hidden bg-white mt-[74px]">
        <div className="flex h-full w-full">

          <aside className="h-full w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
            <div className="flex h-full flex-col gap-1 p-4">
              <nav className="flex flex-col gap-1">
                {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <button
                onClick={handleLogout}
                className="mt-auto flex items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>

          <section className="min-w-0 flex-1 overflow-y-auto px-6 py-6 lg:px-8 lg:py-8">
            <div className="mb-6 border-b border-slate-100 pb-4">
              <h1 className="text-xl font-semibold text-slate-900 sm:text-2xl">{headerInfo.title}</h1>
              {headerInfo.description && <p className="mt-1 text-sm text-slate-600">{headerInfo.description}</p>}
            </div>
            <Outlet />
          </section>

        </div>
      </main>
    </>
  );
};

export default ProfileLayout;
