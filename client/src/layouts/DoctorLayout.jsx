import React from "react";
import {
  Bell,
  CalendarCheck2,
  FileText,
  MessageSquareText,
  Stethoscope,
  Users,
  Video,
  Settings,
} from "lucide-react";
import DashboardLayout from "./DashboardLayout";

const DOCTOR_NAV_ITEMS = [
  { to: "/dashboard/doctor", label: "Dashboard", icon: Stethoscope },
  {
    to: "/dashboard/doctor/appointments",
    label: "Appointments",
    icon: CalendarCheck2,
    children: [
      { to: "/dashboard/doctor/appointments/today", label: "Today" },
      { to: "/dashboard/doctor/appointments/upcoming", label: "Upcoming" },
      { to: "/dashboard/doctor/appointments", label: "All Appointments", exact: true },
    ],
  },
  { to: "/dashboard/doctor/video-calls", label: "Video Calls", icon: Video },
  { to: "/dashboard/doctor/patients", label: "Patients", icon: Users },
  {
    to: "/dashboard/doctor/requests",
    label: "Requests",
    icon: FileText,
    children: [
      { to: "/dashboard/doctor/requests/affiliations", label: "Affiliations" },
      { to: "/dashboard/doctor/requests/schedule-changes", label: "Schedule Changes" },
      { to: "/dashboard/doctor/requests/leave", label: "Leave" },
    ],
  },
  { to: "/dashboard/doctor/reviews", label: "Reviews", icon: MessageSquareText },
  { to: "/dashboard/doctor/notifications", label: "Notifications", icon: Bell },
  { to: "/dashboard/doctor/settings", label: "Settings", icon: Settings },
];

const DOCTOR_HEADER_MAP = {
  "/dashboard/doctor": { title: "Dashboard", description: "Real-time practice analytics, schedule overviews, and daily statistics." },
  "/dashboard/doctor/appointments": { title: "Appointments", description: "View and manage all your scheduled clinical appointments." },
  "/dashboard/doctor/appointments/today": { title: "Today's Appointments", description: "Your schedule and clinical queue for today." },
  "/dashboard/doctor/appointments/upcoming": { title: "Upcoming Appointments", description: "Upcoming slots and scheduled clinic consultations." },
  "/dashboard/doctor/video-calls": { title: "Video Calls", description: "Manage and initiate your remote video-consultations." },
  "/dashboard/doctor/patients": { title: "My Patients", description: "Review medical files and appointment history for your patients." },
  "/dashboard/doctor/requests/affiliations": { title: "Affiliations", description: "Manage hospital affiliation requests and respond to invitations from hospitals." },
  "/dashboard/doctor/requests/schedule-changes": { title: "Schedule Changes", description: "View current hospital schedules and submit schedule update requests." },
  "/dashboard/doctor/requests/leave": { title: "Leave", description: "Create leave requests for your active hospital assignments and track recent entries." },
  "/dashboard/doctor/reviews": { title: "Patient Reviews", description: "Review patient feedback, ratings, and clinical testimonials." },
  "/dashboard/doctor/notifications": { title: "Notifications", description: "Clinical alerts, affiliation approvals, and patient updates." },
  "/dashboard/doctor/settings": { title: "Settings", description: "Manage your clinical profile, consultation fees, and account settings." },
};

const DoctorLayout = () => (
  <DashboardLayout
    navItems={DOCTOR_NAV_ITEMS}
    headerMap={DOCTOR_HEADER_MAP}
    rootPath="/dashboard/doctor"
    fallbackTitle="Dashboard"
  />
);

export default DoctorLayout;
