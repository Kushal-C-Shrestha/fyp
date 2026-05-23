import React, { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

// ── Auth pages ────────────────────────────────────────────────────────────────
import Login from "../pages/auth/Login.jsx";
import Register from "../pages/auth/Register.jsx";
import RegisterVerification from "../pages/auth/RegisterVerification.jsx";
import ForgotPassword from "../pages/auth/ForgotPassword.jsx";

// ── Public / browsing pages ───────────────────────────────────────────────────
import Home from "../pages/public/Home.jsx";
import RegisterDoctor from "../pages/public/RegisterDoctor.jsx";
import RegisterHospital from "../pages/public/RegisterHospital.jsx";
import Doctors from "../pages/public/Doctors.jsx";
import DoctorDetails from "../pages/public/DoctorDetails.jsx";
import DoctorReviews from "../pages/public/DoctorReviews.jsx";
import DoctorWriteReview from "../pages/public/DoctorWriteReview.jsx";
import Hospitals from "../pages/public/Hospitals.jsx";
import HospitalDetails from "../pages/public/HospitalDetails.jsx";
import HospitalReviewsPublic from "../pages/public/HospitalReviews.jsx";
import BookAppointment from "../pages/public/BookAppointment.jsx";

// ── Blog pages ────────────────────────────────────────────────────────────────
import BlogList from "../pages/blog/Blogs.jsx";
import BlogDetail from "../pages/blog/BlogDetail.jsx";
import BlogEditor from "../pages/blog/BlogEditorPage.jsx";
import ManageBlogs from "../pages/blog/ManageBlogs.jsx";

// ── Doctor dashboard pages ────────────────────────────────────────────────────
import DoctorDashboard from "../pages/doctor/Dashboard.jsx";
import DoctorAppointmentsAll from "../pages/doctor/AppointmentsAll.jsx";
import DoctorAppointmentsToday from "../pages/doctor/AppointmentsToday.jsx";
import DoctorAppointmentsUpcoming from "../pages/doctor/AppointmentsUpcoming.jsx";
import DoctorVideoCalls from "../pages/doctor/VideoCalls.jsx";
import DoctorVideoCall from "../pages/user/VideoCall.jsx";
import DoctorPatients from "../pages/doctor/Patients.jsx";
import DoctorReviewsDashboard from "../pages/doctor/Reviews.jsx";
import DoctorSchedules from "../pages/doctor/Schedules.jsx";
import DoctorNotifications from "../pages/doctor/Notifications.jsx";
import DoctorSettings from "../pages/doctor/Settings.jsx";

// ── Hospital dashboard pages ──────────────────────────────────────────────────
import HospitalDashboard from "../pages/hospital/Dashboard.jsx";
import HospitalAppointments from "../pages/hospital/Appointments.jsx";
import HospitalDoctors from "../pages/hospital/Doctors.jsx";
import HospitalPatients from "../pages/hospital/Patients.jsx";
import HospitalReviews from "../pages/hospital/Reviews.jsx";
import HospitalDoctorRequests from "../pages/hospital/DoctorRequests.jsx";
import HospitalScheduleRequests from "../pages/hospital/ScheduleRequests.jsx";
import HospitalNotifications from "../pages/hospital/Notifications.jsx";
import HospitalSettings from "../pages/hospital/Settings.jsx";

// ── Admin dashboard pages ─────────────────────────────────────────────────────
import AdminDashboard from "../pages/admin/Dashboard.jsx";
import AdminDoctors from "../pages/admin/Doctors.jsx";
import AdminHospitals from "../pages/admin/Hospitals.jsx";
import AdminUsers from "../pages/admin/Users.jsx";
import AdminReviews from "../pages/admin/Reviews.jsx";
import AdminAppointments from "../pages/admin/Appointments.jsx";
import AdminDoctorRequests from "../pages/admin/DoctorRequests.jsx";
import AdminDoctorRequestDetail from "../pages/admin/DoctorRequestDetail.jsx";
import AdminHospitalRequests from "../pages/admin/HospitalRequests.jsx";
import AdminHospitalRequestDetail from "../pages/admin/HospitalRequestDetail.jsx";
import AdminBlogRequests from "../pages/admin/BlogRequests.jsx";
import AdminBlogs from "../pages/admin/Blogs.jsx";
import AdminNotifications from "../pages/admin/Notifications.jsx";
import AdminContactMessages from "../pages/admin/ContactMessages.jsx";

// ── Patient / user dashboard pages ───────────────────────────────────────────
import UserAppointments from "../pages/user/Appointments.jsx";
import UserVideoCall from "../pages/user/VideoCall.jsx";
import UserMedicalRecords from "../pages/user/MedicalRecords.jsx";
import UserBlogs from "../pages/user/Blogs.jsx";
import UserReviews from "../pages/user/Reviews.jsx";
import UserNotifications from "../pages/user/Notifications.jsx";
import UserSettings from "../pages/user/Settings.jsx";

// Route guards
import ProtectedRoute from "./ProtectedRoute.jsx";
import PublicRoute from "./PublicRoute.jsx";
import GuestRoute from "./GuestRoute.jsx";

// Layouts
import ProfileLayout from "../layouts/ProfileLayout.jsx";
import DoctorLayout from "../layouts/DoctorLayout.jsx";
import HospitalLayout from "../layouts/HospitalLayout.jsx";
import AdminLayout from "../layouts/AdminLayout.jsx";

import { BLOG_AUTHOR_ROLES } from "../utils/blogs.js";

// Helper component for scrolling.
function ScrollToTopOnRouteChange() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

function AppRoutes() {
  return (
    <>
      <ScrollToTopOnRouteChange />
      <div className="App">
        <Routes>
          {/* Logged in users cannot access this route.*/}
          <Route element={<GuestRoute />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/register/verify-otp" element={<RegisterVerification />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
          </Route>

          {/* Guest and logged in users can access these routes */}
          <Route element={<PublicRoute />}>
            <Route path="/" element={<Home />} />
            <Route path="/register/hospital" element={<RegisterHospital />} />
            <Route path="/register/doctor" element={<RegisterDoctor />} />
            <Route path="/doctors" element={<Doctors />} />
            <Route path="/hospitals" element={<Hospitals />} />
            <Route path="/doctors/:id" element={<DoctorDetails />} />
            <Route path="/doctors/:id/reviews" element={<DoctorReviews />} />
            <Route path="/doctors/:id/write-review" element={<DoctorWriteReview />} />
            <Route path="/doctors/:id/book-appointment" element={<BookAppointment />} />
            <Route path="/hospitals/:id" element={<HospitalDetails />} />
            <Route path="/hospitals/:id/reviews" element={<HospitalReviewsPublic />} />
          </Route>

          <Route path="/blogs" element={<BlogList />} />
          <Route path="/blogs/:slugOrId" element={<BlogDetail />} />

          <Route element={<ProtectedRoute allowedRoles={BLOG_AUTHOR_ROLES} />}>
            <Route path="/blogs/manage" element={<ManageBlogs />} />
            <Route path="/blogs/write" element={<BlogEditor />} />
            <Route path="/blogs/edit/:id" element={<BlogEditor />} />
          </Route>

          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin", ...BLOG_AUTHOR_ROLES,
                ]}
              />
            }
          >
            <Route path="/blogs/preview/:id" element={<BlogDetail isPreview={true} />} />
          </Route>

          {/*User dashboard routes*/}
          <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
            <Route
              path="/profile/appointments/video-call/:appointmentId"
              element={<UserVideoCall />}
            />
            <Route element={<ProfileLayout />}>
              <Route path="/profile" element={<Navigate to="/profile/appointments" replace />} />
              <Route path="/profile/appointments" element={<UserAppointments />} />
              <Route path="/profile/medical-records" element={<UserMedicalRecords />} />
              <Route path="/profile/blogs" element={<UserBlogs />} />
              <Route path="/profile/reviews" element={<UserReviews />} />
              <Route path="/profile/notifications" element={<UserNotifications />} />
              <Route path="/profile/settings" element={<UserSettings />} />
            </Route>
          </Route>

          {/* Doctor dashboard routes  */}
          <Route element={<ProtectedRoute allowedRoles={["doctor"]} />}>
            <Route
              path="/dashboard/doctor/video-calls/chat/:appointmentId"
              element={<DoctorVideoCall />}
            />
            <Route element={<DoctorLayout />}>
              <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
              <Route path="/dashboard/doctor/appointments" element={<DoctorAppointmentsAll />} />
              <Route path="/dashboard/doctor/appointments/today" element={<DoctorAppointmentsToday />} />
              <Route path="/dashboard/doctor/appointments/upcoming" element={<DoctorAppointmentsUpcoming />} />
              <Route path="/dashboard/doctor/video-calls" element={<DoctorVideoCalls />} />
              <Route path="/dashboard/doctor/patients" element={<DoctorPatients />} />
              <Route path="/dashboard/doctor/reviews" element={<DoctorReviewsDashboard />} />
              <Route path="/dashboard/doctor/schedules" element={<Navigate to="/dashboard/doctor/requests/schedule-changes" replace />} />
              <Route path="/dashboard/doctor/requests" element={<Navigate to="/dashboard/doctor/requests/affiliations" replace />} />
              <Route path="/dashboard/doctor/requests/affiliations" element={<DoctorSchedules view="affiliations" />} />
              <Route path="/dashboard/doctor/requests/schedule-changes" element={<DoctorSchedules view="schedule-changes" />} />
              <Route path="/dashboard/doctor/requests/leave" element={<DoctorSchedules view="leave" />} />
              <Route path="/dashboard/doctor/notifications" element={<DoctorNotifications />} />
              <Route path="/dashboard/doctor/settings" element={<DoctorSettings />} />
            </Route>
          </Route>

          {/* Hospital dashboard routes */}
          <Route element={<ProtectedRoute allowedRoles={["hospital"]} />}>
            <Route element={<HospitalLayout />}>
              <Route path="/dashboard/hospital" element={<HospitalDashboard />} />
              <Route path="/dashboard/hospital/appointments" element={<HospitalAppointments />} />
              <Route path="/dashboard/hospital/doctors" element={<HospitalDoctors />} />
              <Route path="/dashboard/hospital/patients" element={<HospitalPatients />} />
              <Route path="/dashboard/hospital/reviews" element={<HospitalReviews />} />
              <Route path="/dashboard/hospital/requests" element={<Navigate to="/dashboard/hospital/requests/doctors" replace />} />
              <Route path="/dashboard/hospital/requests/doctors" element={<HospitalDoctorRequests />} />
              <Route path="/dashboard/hospital/requests/schedules" element={<HospitalScheduleRequests />} />
              <Route path="/dashboard/hospital/notifications" element={<HospitalNotifications />} />
              <Route path="/dashboard/hospital/settings" element={<HospitalSettings />} />
            </Route>
          </Route>

          {/* Admin dashboard routes */}
          <Route
            element={
              <ProtectedRoute
                allowedRoles={[
                  "admin"
                ]}
              />
            }
          >
            <Route element={<AdminLayout />}>
              <Route path="/dashboard/super-admin" element={<AdminDashboard />} />
              <Route path="/dashboard/super-admin/doctors" element={<AdminDoctors />} />
              <Route path="/dashboard/super-admin/users" element={<AdminUsers />} />
              <Route path="/dashboard/super-admin/hospitals" element={<AdminHospitals />} />
              <Route path="/dashboard/super-admin/reviews" element={<Navigate to="/dashboard/super-admin/reviews/hospitals" replace />} />
              <Route path="/dashboard/super-admin/reviews/hospitals" element={<AdminReviews view="hospital" />} />
              <Route path="/dashboard/super-admin/reviews/doctors" element={<AdminReviews view="doctor" />} />
              <Route path="/dashboard/super-admin/reviews/system" element={<AdminReviews view="system" />} />
              <Route path="/dashboard/super-admin/contacts" element={<AdminContactMessages />} />
              <Route path="/dashboard/super-admin/appointments" element={<AdminAppointments />} />
              <Route path="/dashboard/super-admin/requests" element={<Navigate to="/dashboard/super-admin/requests/doctors" replace />} />
              <Route path="/dashboard/super-admin/requests/doctors" element={<AdminDoctorRequests />} />
              <Route path="/dashboard/super-admin/requests/doctors/:requestId" element={<AdminDoctorRequestDetail />} />
              <Route path="/dashboard/super-admin/requests/hospitals" element={<AdminHospitalRequests />} />
              <Route path="/dashboard/super-admin/requests/hospitals/:requestId" element={<AdminHospitalRequestDetail />} />
              <Route path="/dashboard/super-admin/requests/blogs" element={<AdminBlogRequests />} />
              <Route path="/dashboard/super-admin/blogs" element={<AdminBlogs />} />
              <Route path="/dashboard/super-admin/notifications" element={<AdminNotifications />} />
            </Route>
          </Route>
        </Routes>
      </div>
    </>
  );
}

export default AppRoutes;
