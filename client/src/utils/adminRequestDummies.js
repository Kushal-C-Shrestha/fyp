export const DUMMY_DOCTOR_REQUEST_ID = "dummy-doctor-pending";
export const DUMMY_HOSPITAL_REQUEST_ID = "dummy-hospital-pending";

export const dummyDoctorRequest = {
  request_id: DUMMY_DOCTOR_REQUEST_ID,
  request_status: "pending",
  created_at: new Date().toISOString(),
  doctor_name: "Dr. Aarya Sharma",
  doctor_email: "aarya.sharma@example.com",
  doctor_phone: "+977 9800000001",
  doctor_gender: "Female",
  doctor_date_of_birth: "1991-04-12",
  doctor_address: "Lazimpat, Kathmandu",
  doctor_license_number: "NMC-24591",
  doctor_experience_years: 8,
  doctor_description: "Internal medicine physician focused on preventive care, diabetes management, and longitudinal patient follow-up.",
  specializations: ["Internal Medicine", "Diabetology"],
  qualifications: [
    {
      degree_name: "MBBS",
      institution: "Kathmandu Medical College",
      graduation_date: "2014-06-15",
    },
    {
      degree_name: "MD Internal Medicine",
      institution: "Tribhuvan University Teaching Hospital",
      graduation_date: "2018-08-20",
    },
  ],
  experiences: [
    {
      position: "Consultant Physician",
      organization: "City Care Hospital",
      start_date: "2019-01-01",
      end_date: null,
    },
    {
      position: "Medical Officer",
      organization: "Kathmandu General Clinic",
      start_date: "2015-03-01",
      end_date: "2018-12-31",
    },
  ],
  verification_documents: [],
};

export const dummyHospitalRequest = {
  request_id: DUMMY_HOSPITAL_REQUEST_ID,
  request_status: "pending",
  created_at: new Date().toISOString(),
  hospital_name: "Evergreen Community Hospital",
  registration_number: "HSP-2099-441",
  hospital_type_label: "General Hospital",
  hospital_established_year: "2012",
  hospital_website: "https://example.com",
  hospital_address: "Bharatpur-10, Chitwan",
  hospital_opening_time: "08:00:00",
  hospital_closing_time: "20:00:00",
  hospital_days_open: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  hospital_emergency_services: true,
  hospital_license_authority: "Ministry of Health and Population",
  hospital_description: "A mid-sized community hospital offering outpatient care, emergency stabilization, diagnostics, and specialist referrals.",
  hospital_primary_email: "admin@evergreen.example.com",
  hospital_primary_phone: "+977 9800000002",
  hospital_alternate_email: "support@evergreen.example.com",
  hospital_alternate_phone: "+977 9800000003",
  hospital_reception_phone: "+977 056-000000",
  hospital_alternate_reception_phone: "+977 056-000001",
  admin_name: "Suman Adhikari",
  admin_email: "suman.adhikari@example.com",
  admin_phone: "+977 9800000004",
  admin_address: "Bharatpur, Chitwan",
  departments: ["Emergency", "General Medicine", "Pediatrics", "Radiology"],
  facilities: ["24/7 Emergency", "Pharmacy", "Laboratory", "Digital X-ray"],
  verification_documents: [],
};

export const withPendingDoctorDummy = (requests = []) => {
  const list = Array.isArray(requests) ? requests : [];
  const hasPending = list.some((item) => String(item?.request_status || "").toLowerCase() === "pending");
  return hasPending ? list : [dummyDoctorRequest, ...list];
};

export const withPendingHospitalDummy = (requests = []) => {
  const list = Array.isArray(requests) ? requests : [];
  const hasPending = list.some((item) => String(item?.request_status || "").toLowerCase() === "pending");
  return hasPending ? list : [dummyHospitalRequest, ...list];
};
