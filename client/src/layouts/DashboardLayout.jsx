import React, { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, LogOut } from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../hooks/useAuth";

const DashboardNavItem = ({ item, rootPath }) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const hasActiveChild = item.children?.some((child) => (
    child.exact ? location.pathname === child.to : location.pathname.startsWith(child.to)
  ));
  const isMainActive = location.pathname === item.to || Boolean(item.children && hasActiveChild);
  const isExpanded = hasActiveChild || isHovered || isOpen;

  useEffect(() => {
    if (!hasActiveChild) {
      setIsOpen(false);
    }
  }, [hasActiveChild, location.pathname]);

  if (item.children) {
    return (
      <div
        className="flex flex-col gap-1"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
            isMainActive
              ? "bg-emerald-50 text-emerald-700"
              : isOpen
                ? "bg-slate-100 text-slate-900"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          }`}
        >
          <span className="flex items-center gap-2.5">
            {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : null}
            {item.label}
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
        </button>
        {isExpanded ? (
          <div className="ml-5 flex flex-col gap-1 border-l-2 border-slate-100 pl-2">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                end={child.exact}
                className={({ isActive }) =>
                  `flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    isActive ? "text-emerald-700" : "text-slate-500 hover:text-slate-900"
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === rootPath}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
          isActive
            ? "bg-emerald-50 text-emerald-700"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`
      }
    >
      {item.icon ? <item.icon className="h-4 w-4 shrink-0" /> : null}
      {item.label}
    </NavLink>
  );
};

const DashboardLayout = ({
  navItems = [],
  headerMap = {},
  getHeader = null,
  rootPath = "/dashboard",
  fallbackTitle = "Dashboard",
  fallbackDescription = "",
}) => {
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

  const headerInfo = getHeader?.(location.pathname) || headerMap[location.pathname] || {
    title: fallbackTitle,
    description: fallbackDescription,
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      <Navbar />
      <div className="fixed inset-x-0 bottom-0 top-[74px] overflow-hidden bg-white">
        <div className="mx-auto flex h-full max-h-full max-w-[1600px] overflow-hidden">
          <aside className="h-full max-h-full w-64 shrink-0 overflow-hidden border-r border-slate-200">
            <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden p-4">
              <nav className="flex flex-col gap-1">
                {navItems.map((item) => (
                  <DashboardNavItem key={item.to} item={item} rootPath={rootPath} />
                ))}
              </nav>
              <button
                type="button"
                onClick={handleLogout}
                className="mt-auto flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </aside>

          <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 pb-6 pt-3 lg:px-8 lg:pb-8 lg:pt-4">
              <header className="mb-3">
                <h1 className="text-lg font-semibold text-slate-900">{headerInfo.title}</h1>
                {headerInfo.description ? (
                  <p className="mt-0.5 text-xs text-slate-500">{headerInfo.description}</p>
                ) : null}
              </header>
              <Outlet />
            </main>
          </section>
        </div>
      </div>
    </>
  );
};

export default DashboardLayout;
