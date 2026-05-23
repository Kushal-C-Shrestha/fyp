import bcrypt from "bcrypt";

const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || "10", 10);
const DEFAULT_HOSPITAL_ADMIN_PASSWORD = "Hospital@123";

const hospitalSeedData = [
  {
    full_name: "Bir Hospital",
    description: "A premier government-run referral hospital established in Kathmandu, Nepal. Providing round-the-clock intensive care, advanced diagnostic testing, and specialist clinics in Cardiology, Neurology, and General Surgery. It serves as a vital clinical lifeline, offering free and highly subsidized treatments to hundreds of thousands of Nepalese citizens annually.",
    registration_number: "NMC-HOSP-1001",
    primary_email: "bir.hospital@gmail.com",
    primary_phone: "9802000001",
    alternate_email: "birhospital.helpdesk@gmail.com",
    alternate_phone: "9802100001",
    reception_phone: "9802200001",
    alternate_reception_phone: "9802300001",
    website: "https://birhospital.gov.np",
    hospital_type: "government",
    profile_picture: "",
    admin: {
      full_name: "Arun Bhandari",
      email: "arun.bhandari@gmail.com",
      phone: "9861000001",
      date_of_birth: "1984-02-15",
      gender: "male",
      address: "Mahabouddha, Kathmandu",
    },
    departments: ["Emergency", "Cardiology", "Neurology", "Radiology", "Laboratory"],
    facilities: [
      "24/7 Emergency Service",
      "Ambulance Service",
      "ICU",
      "Laboratory Service",
      "CT Scan",
      "MRI",
      "ECG",
    ],
    doctor_assignments: [
      {
        doctor_email: "suman.shrestha@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Friday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 20,
          },
        ],
      },
      {
        doctor_email: "ramesh.poudel@gmail.com",
        availability: [
          {
            days: ["Monday", "Tuesday"],
            start_time: "08:30",
            end_time: "12:30",
            slot_interval_minutes: 30,
          },
          {
            days: ["Thursday"],
            start_time: "14:00",
            end_time: "17:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "manish.rayamajhi@gmail.com",
        availability: [
          {
            days: ["Tuesday", "Thursday"],
            start_time: "14:00",
            end_time: "17:00",
            slot_interval_minutes: 30,
          },
        ],
      },
    ],
  },
  {
    full_name: "Grande International Hospital",
    description: "A world-class private tertiary care hospital located in Dhapasi, Kathmandu. Renowned for its state-of-the-art facilities, private luxury cabins, highly specialized outpatient clinics, and advanced emergency services. Dedicated to rendering premium quality care and clinical excellence through highly qualified physicians and cutting-edge robotic medical technology.",
    registration_number: "NMC-HOSP-1002",
    primary_email: "grande.international@gmail.com",
    primary_phone: "9802000002",
    alternate_email: "grandehospital.support@gmail.com",
    alternate_phone: "9802100002",
    reception_phone: "9802200002",
    alternate_reception_phone: "9802300002",
    website: "https://www.grandehospital.com",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Priya Sharma",
      email: "priya.sharma@gmail.com",
      phone: "9861000002",
      date_of_birth: "1987-06-24",
      gender: "female",
      address: "Tokha Road, Kathmandu",
    },
    departments: ["Outpatient", "Cardiology", "Dermatology", "Surgery", "ICU"],
    facilities: [
      "ICU",
      "Operation Theater",
      "MRI",
      "CT Scan",
      "Ultrasound",
      "Pharmacy",
      "Private Cabin",
      "Online Appointment Booking",
    ],
    doctor_assignments: [
      {
        doctor_email: "nisha.karki@gmail.com",
        availability: [
          {
            days: ["Tuesday", "Thursday"],
            start_time: "10:00",
            end_time: "14:00",
            slot_interval_minutes: 20,
          },
          {
            days: ["Saturday"],
            start_time: "15:00",
            end_time: "18:00",
            slot_interval_minutes: 20,
          },
        ],
      },
      {
        doctor_email: "aayusha.thapa@gmail.com",
        availability: [
          {
            days: ["Sunday", "Tuesday", "Thursday"],
            start_time: "09:30",
            end_time: "13:30",
            slot_interval_minutes: 20,
          },
        ],
      },
      {
        doctor_email: "ramesh.poudel@gmail.com",
        availability: [
          {
            days: ["Wednesday", "Friday"],
            start_time: "14:00",
            end_time: "18:00",
            slot_interval_minutes: 30,
          },
        ],
      },
    ],
  },
  {
    full_name: "Norvic International Hospital",
    description: "A multi-specialty private hospital situated in Thapathali, Kathmandu. Leading the way in modern cardiology interventions, neurology clinical checks, and premium intensive care units. NORVIC offers an exceptional suite of diagnostic laboratories, high-comfort recovery rooms, and patient-centric healthcare systems.",
    registration_number: "NMC-HOSP-1003",
    primary_email: "norvic.international@gmail.com",
    primary_phone: "9802000003",
    alternate_email: "norvichospital.support@gmail.com",
    alternate_phone: "9802100003",
    reception_phone: "9802200003",
    alternate_reception_phone: "9802300003",
    website: "https://www.norvichospital.com",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Milan Koirala",
      email: "milan.koirala@gmail.com",
      phone: "9861000003",
      date_of_birth: "1983-11-09",
      gender: "male",
      address: "Thapathali, Kathmandu",
    },
    departments: ["Outpatient", "Neurology", "Orthopedics", "Cardiology", "Radiology"],
    facilities: [
      "ICU",
      "ECG",
      "Echocardiography",
      "CT Scan",
      "MRI",
      "Pharmacy",
      "Private Cabin",
      "Online Appointment Booking",
    ],
    doctor_assignments: [
      {
        doctor_email: "sneha.maharjan@gmail.com",
        availability: [
          {
            days: ["Wednesday", "Friday", "Saturday"],
            start_time: "10:00",
            end_time: "14:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "kiran.acharya@gmail.com",
        availability: [
          {
            days: ["Sunday", "Tuesday", "Thursday"],
            start_time: "11:00",
            end_time: "15:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "suman.shrestha@gmail.com",
        availability: [
          {
            days: ["Tuesday"],
            start_time: "14:00",
            end_time: "17:00",
            slot_interval_minutes: 20,
          },
          {
            days: ["Thursday"],
            start_time: "09:00",
            end_time: "12:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
  {
    full_name: "Kanti Children's Hospital",
    description: "The only major dedicated pediatric government hospital in Nepal, located in Maharajgunj, Kathmandu. Providing expert neonatal intensive care, pediatric specialized surgery, immunization services, and developmental therapies. The hospital has served as a beacon of clinical hope and pediatric healing for children across all districts of Nepal.",
    registration_number: "NMC-HOSP-1004",
    primary_email: "kanti.childrens@gmail.com",
    primary_phone: "9802000004",
    alternate_email: "kantihospital.support@gmail.com",
    alternate_phone: "9802100004",
    reception_phone: "9802200004",
    alternate_reception_phone: "9802300004",
    website: "https://www.kantichildrenhospital.gov.np",
    hospital_type: "government",
    profile_picture: "",
    admin: {
      full_name: "Ritu Adhikari",
      email: "ritu.adhikari@gmail.com",
      phone: "9861000004",
      date_of_birth: "1988-04-12",
      gender: "female",
      address: "Maharajgunj, Kathmandu",
    },
    departments: ["Emergency", "Pediatrics", "ICU", "Laboratory", "Outpatient"],
    facilities: [
      "Ambulance Service",
      "PICU",
      "NICU",
      "Laboratory Service",
      "Vaccination Service",
      "Newborn Care",
      "Pharmacy",
    ],
    doctor_assignments: [
      {
        doctor_email: "bikash.gurung@gmail.com",
        availability: [
          {
            days: ["Sunday", "Monday", "Wednesday", "Friday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 20,
          },
        ],
      },
      {
        doctor_email: "anjana.joshi@gmail.com",
        availability: [
          {
            days: ["Tuesday", "Thursday", "Saturday"],
            start_time: "10:00",
            end_time: "14:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
  {
    full_name: "B & B Hospital",
    description: "A landmark private general and orthopedic specialty hospital in Gwarko, Lalitpur. Highly respected for top-tier joint replacements, trauma care, plastic surgery, and rehabilitation physiotherapy services. Equipped with state-of-the-art diagnostic facilities and specialized outpatient recovery plans.",
    registration_number: "NMC-HOSP-1005",
    primary_email: "bnb.hospital@gmail.com",
    primary_phone: "9802000005",
    alternate_email: "bnbhospital.support@gmail.com",
    alternate_phone: "9802100005",
    reception_phone: "9802200005",
    alternate_reception_phone: "9802300005",
    website: "https://www.bbhospital.com.np",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Sandeep Khadka",
      email: "sandeep.khadka@gmail.com",
      phone: "9861000005",
      date_of_birth: "1985-09-18",
      gender: "male",
      address: "Gwarko, Lalitpur",
    },
    departments: ["Outpatient", "Orthopedics", "Dermatology", "Surgery", "Radiology"],
    facilities: [
      "Operation Theater",
      "X-Ray",
      "CT Scan",
      "Physiotherapy Service",
      "Private Cabin",
      "Pharmacy",
      "Parking",
    ],
    doctor_assignments: [
      {
        doctor_email: "prakash.adhikari@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Friday"],
            start_time: "11:00",
            end_time: "15:00",
            slot_interval_minutes: 20,
          },
        ],
      },
      {
        doctor_email: "sabina.rai@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Saturday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 30,
          },
        ],
      },
    ],
  },
  {
    full_name: "T.U. Teaching Hospital",
    description: "A prestigious government academic and tertiary referral center in Maharajgunj, Kathmandu. Renowned for its excellence in clinical training, general and specialized surgeries, and multi-department outpatient clinics. TUTH is highly trusted for providing top-tier medical diagnostics at public-service rates.",
    registration_number: "NMC-HOSP-1006",
    primary_email: "tuth.hospital@gmail.com",
    primary_phone: "9802000006",
    alternate_email: "tuth.support@gmail.com",
    alternate_phone: "9802100006",
    reception_phone: "9802200006",
    alternate_reception_phone: "9802300006",
    website: "https://tuth.org.np",
    hospital_type: "government",
    profile_picture: "",
    admin: {
      full_name: "Karan Thapa",
      email: "karan.thapa@gmail.com",
      phone: "9861000006",
      date_of_birth: "1982-10-14",
      gender: "male",
      address: "Maharajgunj, Kathmandu",
    },
    departments: ["Emergency", "Surgery", "Outpatient", "Radiology", "Laboratory"],
    facilities: [
      "24/7 Emergency Service",
      "Ambulance Service",
      "Operation Theater",
      "Laboratory Service",
      "X-Ray",
      "General Ward",
    ],
    doctor_assignments: [
      {
        doctor_email: "rajesh.manandhar@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Friday"],
            start_time: "08:00",
            end_time: "12:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "harish.shah@gmail.com",
        availability: [
          {
            days: ["Tuesday", "Thursday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
  {
    full_name: "Patan Hospital",
    description: "A highly distinguished community-focused government and teaching hospital in Lagankhel, Lalitpur. Famous for its exceptional maternity services, newborn care, family medicine clinics, and community outreach health programs. Patan Hospital represents the benchmark for compassionate public healthcare delivery in Nepal.",
    registration_number: "NMC-HOSP-1007",
    primary_email: "patan.hospital@gmail.com",
    primary_phone: "9802000007",
    alternate_email: "patan.support@gmail.com",
    alternate_phone: "9802100007",
    reception_phone: "9802200007",
    alternate_reception_phone: "9802300007",
    website: "https://www.patanhospital.org.np",
    hospital_type: "community",
    profile_picture: "",
    admin: {
      full_name: "Saroj Dhakal",
      email: "saroj.dhakal@gmail.com",
      phone: "9861000007",
      date_of_birth: "1979-05-18",
      gender: "male",
      address: "Lagankhel, Lalitpur",
    },
    departments: ["Emergency", "Outpatient", "Pediatrics", "Gynecology", "Laboratory"],
    facilities: [
      "24/7 Emergency Service",
      "Ambulance Service",
      "Maternity Service",
      "Newborn Care",
      "Laboratory Service",
      "Pharmacy",
    ],
    doctor_assignments: [
      {
        doctor_email: "amit.bajracharya@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Thursday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "maya.devkota@gmail.com",
        availability: [
          {
            days: ["Monday", "Tuesday", "Wednesday"],
            start_time: "14:00",
            end_time: "17:00",
            slot_interval_minutes: 30,
          },
        ],
      },
    ],
  },
  {
    full_name: "Civil Service Hospital",
    description: "A state-of-the-art government medical center in Minbhawan, Kathmandu. Dedicated to providing highly affordable, premium quality clinical interventions, diagnostic radiology, and respiratory treatments to civil servants and the general public alike.",
    registration_number: "NMC-HOSP-1008",
    primary_email: "civil.hospital@gmail.com",
    primary_phone: "9802000008",
    alternate_email: "civil.helpdesk@gmail.com",
    alternate_phone: "9802100008",
    reception_phone: "9802200008",
    alternate_reception_phone: "9802300008",
    website: "https://civilhospital.gov.np",
    hospital_type: "government",
    profile_picture: "",
    admin: {
      full_name: "Ganesh Kharel",
      email: "ganesh.kharel@gmail.com",
      phone: "9861000008",
      date_of_birth: "1980-12-14",
      gender: "male",
      address: "Minbhawan, Kathmandu",
    },
    departments: ["Outpatient", "Radiology", "ICU", "Laboratory"],
    facilities: [
      "Ambulance Service",
      "ICU",
      "CT Scan",
      "Radiology Service",
      "Laboratory Service",
      "Pharmacy",
    ],
    doctor_assignments: [
      {
        doctor_email: "sunita.bhandari@gmail.com",
        availability: [
          {
            days: ["Monday", "Tuesday", "Thursday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
  {
    full_name: "HAMS Hospital",
    description: "Hospital for Advanced Medicine and Surgery, an elite private care facility in Dhumbarahi, Kathmandu. Delivering international standard tertiary clinical systems, high-end surgical procedures, intensive emergency medicine, and multi-department specialty care.",
    registration_number: "NMC-HOSP-1009",
    primary_email: "hams.hospital@gmail.com",
    primary_phone: "9802000009",
    alternate_email: "hams.help@gmail.com",
    alternate_phone: "9802100009",
    reception_phone: "9802200009",
    alternate_reception_phone: "9802300009",
    website: "https://hamshospital.com",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Sushma Regmi",
      email: "sushma.regmi@gmail.com",
      phone: "9861000009",
      date_of_birth: "1989-03-27",
      gender: "female",
      address: "Dhumbarahi, Kathmandu",
    },
    departments: ["Emergency", "Cardiology", "Neurology", "Outpatient", "ICU"],
    facilities: [
      "24/7 Emergency Service",
      "Ambulance Service",
      "ICU",
      "Operation Theater",
      "MRI",
      "CT Scan",
      "Online Appointment Booking",
    ],
    doctor_assignments: [
      {
        doctor_email: "harish.shah@gmail.com",
        availability: [
          {
            days: ["Wednesday", "Friday"],
            start_time: "14:00",
            end_time: "17:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "suman.shrestha@gmail.com",
        availability: [
          {
            days: ["Thursday"],
            start_time: "15:00",
            end_time: "18:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
  {
    full_name: "Nepal Mediciti Hospital",
    description: "The largest and most comprehensive private tertiary care hospital in Bainsipati, Lalitpur. Offering highly advanced clinical setups in Cardiology, Neurology, and Gastroenterology. Features international standard diagnostic equipment, emergency helipad, and elite recovery lounges.",
    registration_number: "NMC-HOSP-1010",
    primary_email: "mediciti.hospital@gmail.com",
    primary_phone: "9802000010",
    alternate_email: "mediciti.support@gmail.com",
    alternate_phone: "9802100010",
    reception_phone: "9802200010",
    alternate_reception_phone: "9802300010",
    website: "https://nepalmediciti.com",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Niranjan Prasai",
      email: "niranjan.prasai@gmail.com",
      phone: "9861000010",
      date_of_birth: "1978-06-25",
      gender: "male",
      address: "Bainsepati, Lalitpur",
    },
    departments: ["Emergency", "Cardiology", "Neurology", "Gynecology", "Radiology"],
    facilities: [
      "ICU",
      "Operation Theater",
      "MRI",
      "CT Scan",
      "Dialysis",
      "Blood Bank",
      "Online Appointment Booking",
    ],
    doctor_assignments: [
      {
        doctor_email: "sujata.baral@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Friday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 20,
          },
        ],
      },
      {
        doctor_email: "binod.pokharel@gmail.com",
        availability: [
          {
            days: ["Tuesday", "Thursday"],
            start_time: "10:00",
            end_time: "14:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "ramesh.poudel@gmail.com",
        availability: [
          {
            days: ["Saturday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 30,
          },
        ],
      },
    ],
  },
  {
    full_name: "Alka Hospital",
    description: "A highly esteemed private general clinical center in Jawalakhel, Lalitpur. Renowned for patient-centered ENT consultations, general medicine, and advanced laboratory solutions. Alka is highly valued for its personal patient touch and friendly support staff.",
    registration_number: "NMC-HOSP-1011",
    primary_email: "alka.hospital@gmail.com",
    primary_phone: "9802000011",
    alternate_email: "alka.support@gmail.com",
    alternate_phone: "9802100011",
    reception_phone: "9802200011",
    alternate_reception_phone: "9802300011",
    website: "https://alkahospital.com",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Jiban Rijal",
      email: "jiban.rijal@gmail.com",
      phone: "9861000011",
      date_of_birth: "1983-09-12",
      gender: "male",
      address: "Jawalakhel, Lalitpur",
    },
    departments: ["Outpatient", "Dermatology", "Surgery", "Radiology", "Laboratory"],
    facilities: [
      "Laboratory Service",
      "Pharmacy",
      "X-Ray",
      "Ultrasound",
      "ECG",
      "Dental Service",
    ],
    doctor_assignments: [
      {
        doctor_email: "deepak.bhattarai@gmail.com",
        availability: [
          {
            days: ["Monday", "Wednesday", "Friday"],
            start_time: "10:00",
            end_time: "14:00",
            slot_interval_minutes: 30,
          },
        ],
      },
      {
        doctor_email: "nisha.karki@gmail.com",
        availability: [
          {
            days: ["Wednesday"],
            start_time: "14:00",
            end_time: "17:00",
            slot_interval_minutes: 20,
          },
          {
            days: ["Friday"],
            start_time: "09:00",
            end_time: "12:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
  {
    full_name: "Nepal Cancer Hospital",
    description: "A premier specialized oncology and clinical care institute in Harisiddhi, Lalitpur. Delivering state-of-the-art diagnostic imaging, chemotherapy protocols, radiation therapy, and specialized outpatient clinics. Highly committed to global standard oncology interventions and recovery support.",
    registration_number: "NMC-HOSP-1012",
    primary_email: "nepalcancer.hospital@gmail.com",
    primary_phone: "9802000012",
    alternate_email: "nchrc.support@gmail.com",
    alternate_phone: "9802100012",
    reception_phone: "9802200012",
    alternate_reception_phone: "9802300012",
    website: "https://nchrc.com.np",
    hospital_type: "private",
    profile_picture: "",
    admin: {
      full_name: "Shishir Adhikari",
      email: "shishir.adhikari@gmail.com",
      phone: "9861000012",
      date_of_birth: "1981-11-20",
      gender: "male",
      address: "Harisiddhi, Lalitpur",
    },
    departments: ["Outpatient", "Radiology", "Laboratory", "ICU"],
    facilities: [
      "ICU",
      "Operation Theater",
      "CT Scan",
      "Laboratory Service",
      "Pharmacy",
      "Blood Bank",
    ],
    doctor_assignments: [
      {
        doctor_email: "srijana.shrestha@gmail.com",
        availability: [
          {
            days: ["Tuesday", "Thursday", "Saturday"],
            start_time: "09:00",
            end_time: "13:00",
            slot_interval_minutes: 20,
          },
        ],
      },
    ],
  },
];

const uniqueValues = (items) => [...new Set(items)];

const createNameIdMap = (rows) =>
  Object.fromEntries(rows.map((row) => [row.name, row.id]));

export const seed = async function (knex) {
  const adminPasswordHash = await bcrypt.hash(
    DEFAULT_HOSPITAL_ADMIN_PASSWORD,
    SALT_ROUNDS
  );

  const departmentNames = uniqueValues(
    hospitalSeedData.flatMap((hospital) => hospital.departments)
  );
  const facilityNames = uniqueValues(
    hospitalSeedData.flatMap((hospital) => hospital.facilities)
  );
  const doctorEmails = uniqueValues(
    hospitalSeedData.flatMap((hospital) =>
      hospital.doctor_assignments.map((assignment) => assignment.doctor_email)
    )
  );

  await knex.transaction(async (trx) => {
    const departmentRows = await trx("departments")
      .select("id", "name")
      .whereIn("name", departmentNames);
    const facilityRows = await trx("facilities")
      .select("id", "name")
      .whereIn("name", facilityNames);
    const doctorRows = await trx("users as u")
      .join("doctors as d", "d.id", "u.id")
      .select("d.id", "u.email")
      .whereIn("u.email", doctorEmails);

    const departmentIdByName = createNameIdMap(departmentRows);
    const facilityIdByName = createNameIdMap(facilityRows);
    const doctorIdByEmail = Object.fromEntries(
      doctorRows.map((doctor) => [doctor.email, doctor.id])
    );

    const missingDepartments = departmentNames.filter(
      (name) => !departmentIdByName[name]
    );
    const missingFacilities = facilityNames.filter((name) => !facilityIdByName[name]);
    const missingDoctors = doctorEmails.filter((email) => !doctorIdByEmail[email]);

    if (missingDepartments.length > 0) {
      throw new Error(
        `Missing departments for hospital seed: ${missingDepartments.join(", ")}`
      );
    }

    if (missingFacilities.length > 0) {
      throw new Error(
        `Missing facilities for hospital seed: ${missingFacilities.join(", ")}`
      );
    }

    if (missingDoctors.length > 0) {
      throw new Error(
        `Missing doctors for hospital assignments: ${missingDoctors.join(", ")}`
      );
    }

    const adminUserRows = hospitalSeedData.map((hospital) => ({
      full_name: hospital.admin.full_name,
      email: hospital.admin.email,
      phone: hospital.admin.phone,
      password: adminPasswordHash,
      date_of_birth: hospital.admin.date_of_birth,
      gender: hospital.admin.gender,
      address: hospital.admin.address,
      profile_picture: null,
      role: "hospital",
      status: "active",
    }));

    const insertedAdmins = await trx("users")
      .insert(adminUserRows)
      .onConflict("email")
      .merge()
      .returning(["id", "email"]);

    const adminIdByEmail = Object.fromEntries(
      insertedAdmins.map((admin) => [admin.email, admin.id])
    );

    const hospitalRowsToInsert = hospitalSeedData.map((hospital) => ({
      full_name: hospital.full_name,
      description: hospital.description,
      registration_number: hospital.registration_number,
      primary_email: hospital.primary_email,
      primary_phone: hospital.primary_phone,
      alternate_email: hospital.alternate_email,
      alternate_phone: hospital.alternate_phone,
      reception_phone: hospital.reception_phone,
      alternate_reception_phone: hospital.alternate_reception_phone,
      website: hospital.website,
      hospital_type: hospital.hospital_type,
      profile_picture: hospital.profile_picture || null,
      status: "active",
    }));

    const insertedHospitals = await trx("hospitals")
      .insert(hospitalRowsToInsert)
      .onConflict("registration_number")
      .merge()
      .returning(["id", "registration_number"]);

    const hospitalIdByRegistrationNumber = Object.fromEntries(
      insertedHospitals.map((hospital) => [hospital.registration_number, hospital.id])
    );
    const seededHospitalIds = insertedHospitals.map((hospital) => hospital.id);
    await trx("hospital_admin").whereIn("hospital_id", seededHospitalIds).del();
    await trx("hospital_departments").whereIn("hospital_id", seededHospitalIds).del();
    await trx("hospital_facilities").whereIn("hospital_id", seededHospitalIds).del();

    const hospitalAdminRows = hospitalSeedData.map((hospital) => ({
      hospital_id: hospitalIdByRegistrationNumber[hospital.registration_number],
      user_id: adminIdByEmail[hospital.admin.email],
    }));

    const hospitalDepartmentRows = hospitalSeedData.flatMap((hospital) =>
      hospital.departments.map((departmentName) => ({
        hospital_id: hospitalIdByRegistrationNumber[hospital.registration_number],
        department_id: departmentIdByName[departmentName],
      }))
    );

    const hospitalFacilityRows = hospitalSeedData.flatMap((hospital) =>
      hospital.facilities.map((facilityName) => ({
        hospital_id: hospitalIdByRegistrationNumber[hospital.registration_number],
        facility_id: facilityIdByName[facilityName],
      }))
    );

    await trx("hospital_admin").insert(hospitalAdminRows);
    await trx("hospital_departments").insert(hospitalDepartmentRows);
    await trx("hospital_facilities").insert(hospitalFacilityRows);

    for (const hospital of hospitalSeedData) {
      const hospitalId = hospitalIdByRegistrationNumber[hospital.registration_number];

      for (const assignment of hospital.doctor_assignments) {
        const doctorId = doctorIdByEmail[assignment.doctor_email];

        let assignmentRow = await trx("doctor_hospital_assignments")
          .select("id")
          .where({
            doctor_id: doctorId,
            hospital_id: hospitalId,
          })
          .first();

        if (!assignmentRow) {
          const insertedAssignment = await trx("doctor_hospital_assignments")
            .insert({
              doctor_id: doctorId,
              hospital_id: hospitalId,
              fee: (Math.floor(Math.random() * 6) + 5) * 100, // Rs. 500 to Rs. 1000
            })
            .returning("id");

          assignmentRow = Array.isArray(insertedAssignment)
            ? insertedAssignment[0]
            : insertedAssignment;
        }

        const assignmentId = assignmentRow.id;
        await trx("assignment_availability")
          .where("assignment_id", assignmentId)
          .del();

        const availabilityRows = assignment.availability.flatMap((slot) =>
          slot.days.map((day) => ({
            assignment_id: assignmentId,
            day_of_week: day,
            start_time: slot.start_time,
            end_time: slot.end_time,
            slot_interval_minutes: slot.slot_interval_minutes,
          }))
        );

        if (availabilityRows.length > 0) {
          await trx("assignment_availability").insert(availabilityRows);
        }
      }
    }

    // Seed some system reviews to display on the frontend
    const patients = await trx("users").select("id").where("role", "user");
    const patientIds = patients.map((p) => p.id);

    if (patientIds.length > 0) {
      const reviewsData = [
        {
          patient_id: patientIds[0],
          doctor_id: doctorIdByEmail["suman.shrestha@gmail.com"],
          rating: 5,
          comment: "Excellent experience. Dr. Suman was highly professional and explained my cardiology reports with great care and patience.",
        },
        {
          patient_id: patientIds[1] || patientIds[0],
          doctor_id: doctorIdByEmail["ramesh.poudel@gmail.com"],
          rating: 4,
          comment: "Very polite doctor. He arrived right on time and provided incredibly helpful neurological therapy guidance. Highly recommended.",
        },
        {
          patient_id: patientIds[2] || patientIds[0],
          doctor_id: doctorIdByEmail["manish.rayamajhi@gmail.com"],
          rating: 5,
          comment: "Outstanding medical attention. The clinical endocrinology consultation was absolutely comprehensive and patient-centered.",
        },
        {
          patient_id: patientIds[3] || patientIds[0],
          doctor_id: doctorIdByEmail["nisha.karki@gmail.com"],
          rating: 5,
          comment: "Superb diagnosis! She explained the chest pain concerns very calmly and gave practical recommendations.",
        },
        {
          patient_id: patientIds[4] || patientIds[0],
          doctor_id: doctorIdByEmail["harish.shah@gmail.com"],
          rating: 4,
          comment: "Thorough general checkup. Dr. Harish spent ample time understanding my medical history. Great consultation.",
        },
        {
          patient_id: patientIds[5] || patientIds[0],
          doctor_id: doctorIdByEmail["bikash.gurung@gmail.com"],
          rating: 5,
          comment: "Best pediatrician in town! Very friendly with kids, and my toddler felt highly comfortable during the checkup.",
        },
        {
          patient_id: patientIds[0],
          hospital_id: hospitalIdByRegistrationNumber["NMC-HOSP-1001"], // Bir Hospital
          rating: 4,
          comment: "Bir Hospital's new facility is very well managed, clean, and has polite reception staff. High-quality service.",
        },
        {
          patient_id: patientIds[1] || patientIds[0],
          hospital_id: hospitalIdByRegistrationNumber["NMC-HOSP-1002"], // Grande
          rating: 5,
          comment: "Top-notch diagnostic laboratory services and super comfortable outpatient recovery suites at Grande.",
        },
        {
          patient_id: patientIds[2] || patientIds[0],
          hospital_id: hospitalIdByRegistrationNumber["NMC-HOSP-1003"], // Norvic
          rating: 5,
          comment: "NORVIC has incredibly advanced cardiology facilities. Extremely quick emergency intake and clean environment.",
        },
        {
          patient_id: patientIds[3] || patientIds[0],
          hospital_id: hospitalIdByRegistrationNumber["NMC-HOSP-1010"], // Mediciti
          rating: 5,
          comment: "Mediciti offers premium global-standard clinical setups. Exceptional doctors and very clean infrastructure.",
        }
      ];

      await trx("reviews").del();
      const validReviews = reviewsData.filter((r) => r.patient_id && (r.doctor_id || r.hospital_id));
      if (validReviews.length > 0) {
        await trx("reviews").insert(validReviews);
      }
    }
  });
};
