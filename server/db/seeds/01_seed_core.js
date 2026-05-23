const roleRows = [
  { role: "user" },
  { role: "doctor" },
  { role: "hospital" },
  { role: "admin" },
];

const specializationRows = [
  { name: "General Medicine" },
  { name: "Internal Medicine" },
  { name: "Family Medicine" },
  { name: "Cardiology" },
  { name: "Dermatology" },
  { name: "Neurology" },
  { name: "Pediatrics" },
  { name: "Psychiatry" },
  { name: "Radiology" },
  { name: "Oncology" },
  { name: "Orthopedics" },
  { name: "General Surgery" },
  { name: "Obstetrics and Gynecology" },
  { name: "ENT" },
  { name: "Ophthalmology" },
  { name: "Urology" },
  { name: "Nephrology" },
  { name: "Gastroenterology" },
  { name: "Pulmonology" },
  { name: "Endocrinology" },
  { name: "Hematology" },
  { name: "Rheumatology" },
  { name: "Anesthesiology" },
  { name: "Pathology" },
  { name: "Emergency Medicine" },
  { name: "Plastic Surgery" },
  { name: "Neurosurgery" },
  { name: "Cardiothoracic Surgery" },
  { name: "Infectious Disease" },
  { name: "Sports Medicine" },
  { name: "Geriatrics" },
  { name: "Rehabilitation Medicine" },
  { name: "Critical Care Medicine" },
];

const departmentRows = [
  { name: "Emergency" },
  { name: "Outpatient" },
  { name: "Cardiology" },
  { name: "Dermatology" },
  { name: "Neurology" },
  { name: "Pediatrics" },
  { name: "Orthopedics" },
  { name: "Surgery" },
  { name: "Gynecology" },
  { name: "Radiology" },
  { name: "ICU" },
  { name: "Laboratory" },
];

const facilityRows = [
  { name: "24/7 Emergency Service" },
  { name: "Ambulance Service" },
  { name: "ICU" },
  { name: "NICU" },
  { name: "PICU" },
  { name: "Operation Theater" },
  { name: "Laboratory Service" },
  { name: "Pharmacy" },
  { name: "Radiology Service" },
  { name: "X-Ray" },
  { name: "CT Scan" },
  { name: "MRI" },
  { name: "Ultrasound" },
  { name: "ECG" },
  { name: "Echocardiography" },
  { name: "Dialysis" },
  { name: "Blood Bank" },
  { name: "Vaccination Service" },
  { name: "Physiotherapy Service" },
  { name: "Dental Service" },
  { name: "Burn Care Unit" },
  { name: "Trauma Care" },
  { name: "Ventilator Support" },
  { name: "Private Cabin" },
  { name: "General Ward" },
  { name: "Maternity Service" },
  { name: "Newborn Care" },
  { name: "Telemedicine" },
  { name: "Health Checkup Package" },
  { name: "Parking" },
  { name: "Wheelchair Access" },
  { name: "Cafeteria" },
  { name: "Online Appointment Booking" },
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const seed = async function (knex) {
  await knex("roles").insert(roleRows).onConflict("role").ignore();
  await knex("specializations").insert(specializationRows).onConflict("name").ignore();
  await knex("departments").insert(departmentRows).onConflict("name").ignore();
  await knex("facilities").insert(facilityRows).onConflict("name").ignore();
};
