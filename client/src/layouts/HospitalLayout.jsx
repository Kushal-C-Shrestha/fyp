import React from "react";
import {
  Bell,
  Building2,
  CalendarCheck2,
  FileText,
  MessageSquareText,
  User,
  Users,
  Settings,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const HOSPITAL_NAV_ITEMS = [
  { to: "/dashboard/hospital", label: "Dashboard", icon: Building2 },
  { to: "/dashboard/hospital/appointments", label: "Appointments", icon: CalendarCheck2 },
  { to: "/dashboard/hospital/doctors", label: "Doctors", icon: User },
  { to: "/dashboard/hospital/patients", label: "Patients", icon: Users },
  { to: "/dashboard/hospital/reviews", label: "Reviews", icon: MessageSquareText },
  {
    to: "/dashboard/hospital/requests",
    label: "Requests",
    icon: FileText,
    children: [
      { to: "/dashboard/hospital/requests/doctors", label: "Doctor Requests" },
      { to: "/dashboard/hospital/requests/schedules", label: "Schedule Requests" },
    ],
  },
  { to: "/dashboard/hospital/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/hospital/settings", label: "Settings", icon: Settings },
];

const HOSPITAL_HEADER_MAP = {
  "/dashboard/hospital": { title: "Hospital Overview", description: "Real-time analytics and platform performance." },
  "/dashboard/hospital/appointments": { title: "Appointments", description: "Monitor patient queues and clinical bookings across all departments." },
  "/dashboard/hospital/doctors": { title: "Affiliated Doctors", description: "Manage clinical staff, fee schedules, and active duty assignments." },
  "/dashboard/hospital/patients": { title: "Patients Registry", description: "Browse registered patients, check-in histories, and records." },
  "/dashboard/hospital/reviews": { title: "Hospital Reviews", description: "Read patients' feedback and track department quality ratings." },
  "/dashboard/hospital/requests/doctors": { title: "Doctor Affiliation Requests", description: "Manage and respond to doctor affiliation requests and hospital invitations." },
  "/dashboard/hospital/requests/schedules": { title: "Operational Requests", description: "Review schedule changes and leave requests from affiliated doctors." },
  "/dashboard/hospital/notifications": { title: "Notifications", description: "Hospital-wide operational notifications and request alerts." },
  "/dashboard/hospital/settings": { title: "Settings", description: "Manage your hospital profile and administration details." },
};

const HospitalLayout = () => (
  <DashboardLayout
    navItems={HOSPITAL_NAV_ITEMS}
    headerMap={HOSPITAL_HEADER_MAP}
    rootPath="/dashboard/hospital"
    fallbackTitle="Hospital Overview"
  />
);

export default HospitalLayout;
