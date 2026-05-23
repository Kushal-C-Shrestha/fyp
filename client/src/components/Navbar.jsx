import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Bell, Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import UserAvatar from './UserAvatar';
import { getDefaultRouteForRole, normalizeRole } from '../utils/roleRouting';
import { useNotifications } from '../hooks/useNotifications';
import BrandMark from './BrandMark';

const resolveNotificationsPath = (pathname, role) => {
  if (pathname.startsWith('/dashboard/doctor')) return '/dashboard/doctor/notifications';
  if (pathname.startsWith('/dashboard/hospital')) return '/dashboard/hospital/notifications';
  if (pathname.startsWith('/dashboard/super-admin')) return '/dashboard/super-admin/notifications';
  if (pathname.startsWith('/profile')) return '/profile/notifications';

  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'doctor') return '/dashboard/doctor/notifications';
  if (normalizedRole === 'hospital' || normalizedRole === 'hospital_admin') {
    return '/dashboard/hospital/notifications';
  }
  if (normalizedRole.includes('admin')) return '/dashboard/super-admin/notifications';
  return '/profile/notifications';
};

const toNotificationTimestamp = (value) => {
  const parsed = new Date(value || '').getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsPreviewOpen, setIsNotificationsPreviewOpen] = useState(false);
  const location = useLocation();
  const notificationsPreviewCloseTimerRef = useRef(null);
  const displayName = user?.name || user?.user_name || 'User';
  const profileImage = user?.user_profile_picture || user?.profile_picture || user?.user_profile || user?.profile || '';
  const dashboardRoute = getDefaultRouteForRole(user?.role);
  const normalizedRole = normalizeRole(user?.role);
  const notificationsPath = resolveNotificationsPath(location.pathname, user?.role);
  const shouldUseDashboardOnlyNav = new Set([
    'doctor',
    'hospital',
    'hospital_admin',
    'admin',
    'super_admin',
    'main_super_admin',
    'mainsuperadmin',
  ]).has(normalizedRole);
  const { notifications, loading: notificationsLoading, error: notificationsError, markNotificationAsRead } =
    useNotifications(Boolean(user));
  const latestNotifications = useMemo(
    () =>
      [...(Array.isArray(notifications) ? notifications : [])]
        .sort((a, b) => toNotificationTimestamp(b?.created_at) - toNotificationTimestamp(a?.created_at))
        .slice(0, 4),
    [notifications]
  );
  const unreadNotificationCount = Array.isArray(notifications)
    ? notifications.filter((item) => !item?.is_read).length
    : 0;
  const mobileAccountLabel = shouldUseDashboardOnlyNav ? 'Open Dashboard' : 'My Account';

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsNotificationsPreviewOpen(false);
  }, [location]);

  useEffect(() => {
    if (!isMobileMenuOpen) return undefined;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  useEffect(
    () => () => {
      if (notificationsPreviewCloseTimerRef.current) {
        clearTimeout(notificationsPreviewCloseTimerRef.current);
      }
    },
    []
  );

  const openNotificationsPreview = () => {
    if (notificationsPreviewCloseTimerRef.current) {
      clearTimeout(notificationsPreviewCloseTimerRef.current);
      notificationsPreviewCloseTimerRef.current = null;
    }
    setIsNotificationsPreviewOpen(true);
  };

  const closeNotificationsPreview = (delay = 140) => {
    if (notificationsPreviewCloseTimerRef.current) {
      clearTimeout(notificationsPreviewCloseTimerRef.current);
    }

    notificationsPreviewCloseTimerRef.current = setTimeout(() => {
      setIsNotificationsPreviewOpen(false);
      notificationsPreviewCloseTimerRef.current = null;
    }, delay);
  };

  const navLinks = shouldUseDashboardOnlyNav
    ? []
    : [
        { path: '/', label: 'Home' },
        { path: '/doctors', label: 'Doctors' },
        { path: '/hospitals', label: 'Hospitals' },
        { path: '/blogs', label: 'Blogs' },
      ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex h-[74px] items-center justify-between">
          <BrandMark />

          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive
                      ? 'text-emerald-700'
                      : 'text-slate-600 hover:text-emerald-700'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            {!user ? (
              <>
                <NavLink to="/login" className="inline-flex items-center px-3 py-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800">
                  Log in
                </NavLink>
                <NavLink to="/register" className="inline-flex items-center rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">
                  Get started
                </NavLink>
              </>
            ) : (
              <>
                <div
                  className="relative"
                  onMouseEnter={openNotificationsPreview}
                  onMouseLeave={() => closeNotificationsPreview(140)}
                  onFocusCapture={openNotificationsPreview}
                  onBlurCapture={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      closeNotificationsPreview(80);
                    }
                  }}
                >
                  <NavLink
                    to={notificationsPath}
                    className={({ isActive }) =>
                      `relative inline-flex h-10 w-10 items-center justify-center transition ${
                        isActive
                          ? 'text-emerald-700'
                          : 'text-slate-600 hover:text-slate-900'
                      }`
                    }
                    aria-label="Notifications"
                    title="Notifications"
                    onClick={() => setIsNotificationsPreviewOpen(false)}
                  >
                    <Bell className="h-4.5 w-4.5" />
                    {unreadNotificationCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white">
                        {Math.min(99, unreadNotificationCount)}
                      </span>
                    ) : null}
                  </NavLink>

                  {isNotificationsPreviewOpen ? (
                    <div className="absolute right-0 top-12 z-50 w-[22rem] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
                      <div className="border-b border-slate-200 px-4 py-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                          Latest Notifications
                        </p>
                      </div>

                      <div>
                        {notificationsLoading ? (
                          <p className="px-4 py-4 text-sm text-slate-500">Loading notifications...</p>
                        ) : notificationsError ? (
                          <p className="px-4 py-4 text-sm text-rose-600">{notificationsError}</p>
                        ) : latestNotifications.length > 0 ? (
                          latestNotifications.map((item, index) => (
                            <Link
                              key={item.id}
                              to={item.action_url || notificationsPath}
                              className={`block px-4 py-3 text-slate-900 transition hover:bg-slate-50 ${
                                index === latestNotifications.length - 1 ? '' : 'border-b border-slate-200'
                              }`}
                              onClick={() => {
                                if (!item?.is_read) {
                                  markNotificationAsRead(item.id);
                                }
                                setIsNotificationsPreviewOpen(false);
                              }}
                            >
                              <div className="flex items-center gap-2">
                                {!item?.is_read ? (
                                  <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-sky-600" aria-hidden="true" />
                                ) : null}
                                <p className={`truncate text-sm ${item?.is_read ? 'font-medium' : 'font-bold'}`}>
                                  {item?.title || 'Notification'}
                                </p>
                              </div>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600">
                                {item?.detail || 'Open notification for more details.'}
                              </p>
                              <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                                {item?.time || ''}
                              </p>
                            </Link>
                          ))
                        ) : (
                          <p className="px-4 py-4 text-sm text-slate-500">No notifications yet.</p>
                        )}
                      </div>

                      <div className="border-t border-slate-200 p-3">
                        <Link
                          to={notificationsPath}
                          className="block rounded-xl bg-slate-100 px-3 py-2 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
                          onClick={() => setIsNotificationsPreviewOpen(false)}
                        >
                          View more
                        </Link>
                      </div>
                    </div>
                  ) : null}
                </div>
                <NavLink to={dashboardRoute} className="group flex items-center px-1 py-1">
                  <UserAvatar src={profileImage} name={displayName} size="h-8 w-8" />
                </NavLink>
              </>
            )}
          </div>

          <button
            className="md:hidden rounded-lg border border-slate-200 p-2 text-slate-600"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {isMobileMenuOpen ? (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-x-0 bottom-0 top-[74px] z-40 bg-slate-900/40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-[74px] right-0 z-50 flex w-[min(88vw,320px)] max-w-full flex-col border-l border-slate-200 bg-white px-4 py-4 shadow-2xl shadow-slate-900/15 md:hidden">
            <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
              {user && <UserAvatar src={profileImage} name={displayName} size="h-10 w-10" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{user ? displayName : 'Navigation'}</p>
                <p className="text-xs text-slate-500">{user ? 'Quick links and account actions' : 'Browse e-Swasthya'}</p>
              </div>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto">
              <div className="space-y-1">
                {navLinks.map((link) => (
                  <NavLink
                    key={link.path}
                    to={link.path}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm font-semibold ${
                        isActive ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-700'
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>

              {!user ? (
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <NavLink to="/login" className="inline-flex items-center justify-center rounded-lg border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-700">
                    Log in
                  </NavLink>
                  <NavLink to="/register" className="inline-flex items-center justify-center rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">
                    Register
                  </NavLink>
                </div>
              ) : (
                <div className="mt-5 grid gap-2">
                  <NavLink
                    to={dashboardRoute}
                    className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-700"
                  >
                    {mobileAccountLabel}
                  </NavLink>
                  <NavLink
                    to={notificationsPath}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700"
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                    {unreadNotificationCount > 0 ? (
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                        {Math.min(99, unreadNotificationCount)}
                      </span>
                    ) : null}
                  </NavLink>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-700"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
};

export default Navbar;

