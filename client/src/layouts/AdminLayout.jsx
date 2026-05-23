import React from "react";
import {
  Bell,
  Building2,
  CalendarCheck2,
  FileText,
  Mail,
  MessageSquareText,
  Stethoscope,
  User,
  Users,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const ADMIN_NAV_ITEMS = [
  { to: "/dashboard/super-admin", label: "Dashboard", icon: Stethoscope },
  { to: "/dashboard/super-admin/users", label: "Users", icon: Users },
  { to: "/dashboard/super-admin/doctors", label: "Doctors", icon: User },
  { to: "/dashboard/super-admin/hospitals", label: "Hospitals", icon: Building2 },
  { to: "/dashboard/super-admin/appointments", label: "Appointments", icon: CalendarCheck2 },
  {
    to: "/dashboard/super-admin/reviews",
    label: "Reviews",
    icon: MessageSquareText,
    children: [
      { to: "/dashboard/super-admin/reviews/hospitals", label: "Hospital" },
      { to: "/dashboard/super-admin/reviews/doctors", label: "Doctor" },
      { to: "/dashboard/super-admin/reviews/system", label: "System" },
    ],
  },
  {
    to: "/dashboard/super-admin/requests",
    label: "Requests",
    icon: FileText,
    children: [
      { to: "/dashboard/super-admin/requests/doctors", label: "Doctor Requests" },
      { to: "/dashboard/super-admin/requests/hospitals", label: "Hospital Requests" },
      { to: "/dashboard/super-admin/requests/blogs", label: "Blog Requests" },
    ],
  },
  { to: "/dashboard/super-admin/blogs", label: "Blogs", icon: FileText },
  { to: "/dashboard/super-admin/contacts", label: "Contact Messages", icon: Mail },
  { to: "/dashboard/super-admin/notifications", label: "Notifications", icon: Bell },
];

const getAdminHeader = (pathname) => {
  if (pathname === "/dashboard/super-admin") return { title: "Dashboard", description: "System administration and global platform metrics." };
  if (pathname === "/dashboard/super-admin/users") return { title: "Users Management", description: "Review, manage, and moderate patient accounts." };
  if (pathname === "/dashboard/super-admin/doctors") return { title: "Doctors Registry", description: "Manage doctor credentials, profiles, and platform status." };
  if (pathname === "/dashboard/super-admin/hospitals") return { title: "Hospitals Registry", description: "Verify registered medical centers, manage assignments, and access records." };
  if (pathname === "/dashboard/super-admin/appointments") return { title: "Global Appointments", description: "Monitor system-wide appointment statuses and transaction logs." };
  if (pathname === "/dashboard/super-admin/reviews/hospitals") return { title: "Hospital Reviews", description: "Moderate review logs and feedback left for hospital facilities." };
  if (pathname === "/dashboard/super-admin/reviews/doctors") return { title: "Doctor Reviews", description: "Moderate clinical feedback left for doctors." };
  if (pathname === "/dashboard/super-admin/reviews/system") return { title: "System Reviews", description: "Analyze general platform review feedback and user testimonials." };
  if (pathname === "/dashboard/super-admin/requests/doctors") return { title: "Doctor Registration Requests", description: "Review credentials and approve/reject request." };
  if (pathname.startsWith("/dashboard/super-admin/requests/doctors/")) return { title: "Doctor Registration Request", description: "Review credentials and approve/reject request." };
  if (pathname === "/dashboard/super-admin/requests/hospitals") return { title: "Hospital Registration Requests", description: "Review application forms and approve/reject request." };
  if (pathname.startsWith("/dashboard/super-admin/requests/hospitals/")) return { title: "Hospital Registration Request", description: "Review application forms and approve/reject request." };
  if (pathname === "/dashboard/super-admin/requests/blogs") return { title: "Blog Approval Requests", description: "Review draft articles and moderate health content publishes." };
  if (pathname === "/dashboard/super-admin/blogs") return { title: "Content Registry", description: "Review and manage all platform-wide blog publications." };
  if (pathname === "/dashboard/super-admin/contacts") return { title: "Contact Messages", description: "Manage and respond to user inquiries." };
  if (pathname === "/dashboard/super-admin/notifications") return { title: "Notifications", description: "Platform administration announcements and notification inbox." };
  return { title: "Super Admin Dashboard", description: "" };
};

const AdminLayout = () => (
  <DashboardLayout
    navItems={ADMIN_NAV_ITEMS}
    getHeader={getAdminHeader}
    rootPath="/dashboard/super-admin"
    fallbackTitle="Super Admin Dashboard"
  />
);

export default AdminLayout;
