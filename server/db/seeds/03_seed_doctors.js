import bcrypt from "bcrypt";

const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || "10", 10);
const DEFAULT_DOCTOR_PASSWORD = "Doctor@123";

const doctorSeedData = [
  {
    full_name: "Suman Shrestha",
    email: "suman.shrestha@gmail.com",
    phone: "9841000001",
    date_of_birth: "1980-06-14",
    gender: "male",
    address: "New Baneshwor, Kathmandu",
    descriptions: "Consultant cardiologist with over 14 years of clinical experience. Specializes in preventive cardiac care, non-invasive cardiology, hypertension management, and personalized cardiovascular health planning. Dedicated to helping patients achieve optimal heart health through comprehensive diagnostic evaluations and tailored treatment protocols.",
    experience_years: 14,
    license_number: "NMC-2011-1201",
    specializations: ["Cardiology"],
    qualifications: [
      {
        degree_name: "DM Cardiology",
        institution: "Institute of Medicine, Tribhuvan University",
        graduation_date: "2011-11-15",
      },
    ],
    experience: [
      {
        organization: "Shahid Gangalal National Heart Centre",
        position: "Consultant Cardiologist",
        start_date: "2012-01-10",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Nisha Karki",
    email: "nisha.karki@gmail.com",
    phone: "9841000002",
    date_of_birth: "1985-09-02",
    gender: "female",
    address: "Lakeside, Pokhara",
    descriptions: "Experienced cardiologist specialized in chest pain evaluation, advanced echocardiography, and long-term chronic heart disease management. Focuses on holistic cardiovascular wellness, active lifestyle coaching, and evidence-based therapeutic interventions for cardiac patients.",
    experience_years: 10,
    license_number: "NMC-2014-1202",
    specializations: ["Cardiology"],
    qualifications: [
      {
        degree_name: "MD Internal Medicine",
        institution: "B.P. Koirala Institute of Health Sciences",
        graduation_date: "2012-08-20",
      },
      {
        degree_name: "DM Cardiology",
        institution: "National Academy of Medical Sciences",
        graduation_date: "2015-12-18",
      },
    ],
    experience: [
      {
        organization: "Manipal Teaching Hospital",
        position: "Cardiologist",
        start_date: "2016-02-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Prakash Adhikari",
    email: "prakash.adhikari@gmail.com",
    phone: "9841000003",
    date_of_birth: "1982-01-21",
    gender: "male",
    address: "Bharatpur, Chitwan",
    descriptions: "Consultant dermatologist with 12 years of experience in clinical and cosmetic dermatology. Specializes in treating chronic acne, eczema, psoriasis, skin infections, and performing minor outpatient dermatosurgical procedures with patient safety and precision.",
    experience_years: 12,
    license_number: "NMC-2012-2301",
    specializations: ["Dermatology"],
    qualifications: [
      {
        degree_name: "MD Dermatology",
        institution: "Kathmandu Medical College",
        graduation_date: "2012-07-30",
      },
    ],
    experience: [
      {
        organization: "Chitwan Medical College Teaching Hospital",
        position: "Consultant Dermatologist",
        start_date: "2013-03-15",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Aayusha Thapa",
    email: "aayusha.thapa@gmail.com",
    phone: "9841000004",
    date_of_birth: "1988-04-19",
    gender: "female",
    address: "Dhapasi, Kathmandu",
    descriptions: "Dermatologist specialized in skin allergy care, pediatric dermatology, pigmentation disorders, and customized aesthetic skin treatments. Believes in patient-centered approaches to chronic skin disease management and evidence-based clinical practices.",
    experience_years: 8,
    license_number: "NMC-2016-2302",
    specializations: ["Dermatology"],
    qualifications: [
      {
        degree_name: "MD Dermatology",
        institution: "Nepal Medical College",
        graduation_date: "2016-09-12",
      },
    ],
    experience: [
      {
        organization: "Grande International Hospital",
        position: "Consultant Dermatologist",
        start_date: "2017-05-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Ramesh Poudel",
    email: "ramesh.poudel@gmail.com",
    phone: "9841000005",
    date_of_birth: "1978-12-08",
    gender: "male",
    address: "Bhaisepati, Lalitpur",
    descriptions: "Senior consultant neurologist with 16 years of clinical experience. Expert in managing stroke rehabilitation, epilepsy and seizure disorders, chronic migraines, and neuropathic pain syndromes. Dedicated to offering comprehensive neurological diagnostics and advanced treatment planning.",
    experience_years: 16,
    license_number: "NMC-2009-3401",
    specializations: ["Neurology"],
    qualifications: [
      {
        degree_name: "DM Neurology",
        institution: "National Academy of Medical Sciences",
        graduation_date: "2009-10-05",
      },
    ],
    experience: [
      {
        organization: "Bir Hospital",
        position: "Senior Consultant Neurologist",
        start_date: "2010-01-20",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Sneha Maharjan",
    email: "sneha.maharjan@gmail.com",
    phone: "9841000006",
    date_of_birth: "1987-11-11",
    gender: "female",
    address: "Madhyapur Thimi, Bhaktapur",
    descriptions: "Neurologist specialized in movement disorders, neurodegenerative conditions, cognitive health, and epilepsy counselling. Committed to delivering compassionate, detailed patient evaluations and state-of-the-art neuro-diagnostic follow-up care.",
    experience_years: 9,
    license_number: "NMC-2015-3402",
    specializations: ["Neurology"],
    qualifications: [
      {
        degree_name: "MD Internal Medicine",
        institution: "Patan Academy of Health Sciences",
        graduation_date: "2013-08-09",
      },
      {
        degree_name: "DM Neurology",
        institution: "B.P. Koirala Institute of Health Sciences",
        graduation_date: "2016-12-02",
      },
    ],
    experience: [
      {
        organization: "Norvic International Hospital",
        position: "Consultant Neurologist",
        start_date: "2017-03-10",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Bikash Gurung",
    email: "bikash.gurung@gmail.com",
    phone: "9841000007",
    date_of_birth: "1984-03-05",
    gender: "male",
    address: "Putalisadak, Kathmandu",
    descriptions: "Compassionate pediatrician focused on childhood infections, growth and development monitoring, pediatric immunization counselling, and comprehensive newborn care. Dedicated to providing supportive family-centered clinical care for children.",
    experience_years: 11,
    license_number: "NMC-2013-4501",
    specializations: ["Pediatrics"],
    qualifications: [
      {
        degree_name: "MD Pediatrics",
        institution: "Institute of Medicine, Tribhuvan University",
        graduation_date: "2013-06-28",
      },
    ],
    experience: [
      {
        organization: "Kanti Children's Hospital",
        position: "Consultant Pediatrician",
        start_date: "2014-02-14",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Anjana Joshi",
    email: "anjana.joshi@gmail.com",
    phone: "9841000008",
    date_of_birth: "1989-07-27",
    gender: "female",
    address: "Damak, Jhapa",
    descriptions: "Pediatric specialist providing outpatient child healthcare, pediatric nutrition guidance, developmental screening, and family counseling. Focused on preventative child medicine and gentle clinical evaluations for young patients.",
    experience_years: 7,
    license_number: "NMC-2017-4502",
    specializations: ["Pediatrics"],
    qualifications: [
      {
        degree_name: "MD Pediatrics",
        institution: "Kathmandu University School of Medical Sciences",
        graduation_date: "2017-11-19",
      },
    ],
    experience: [
      {
        organization: "Birtamode City Hospital",
        position: "Pediatric Specialist",
        start_date: "2018-04-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Kiran Acharya",
    email: "kiran.acharya@gmail.com",
    phone: "9841000009",
    date_of_birth: "1981-05-23",
    gender: "male",
    address: "Butwal, Rupandehi",
    descriptions: "Orthopedic surgeon specializing in complex fracture management, joint pain treatments, sports injuries, and customized post-operative rehabilitation pathways. Committed to restoring patient mobility and joint functionality through modern surgical techniques.",
    experience_years: 13,
    license_number: "NMC-2012-5601",
    specializations: ["Orthopedics"],
    qualifications: [
      {
        degree_name: "MS Orthopedics",
        institution: "B.P. Koirala Institute of Health Sciences",
        graduation_date: "2012-09-14",
      },
    ],
    experience: [
      {
        organization: "Universal College of Medical Sciences",
        position: "Orthopedic Consultant",
        start_date: "2013-01-08",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Sabina Rai",
    email: "sabina.rai@gmail.com",
    phone: "9841000010",
    date_of_birth: "1986-02-16",
    gender: "female",
    address: "Dharan, Sunsari",
    descriptions: "Orthopedic specialist with extensive experience in clinical trauma care, osteoarthritis management, pediatric orthopedics, and long-term joint health restoration. Passionate about empowering patients through rehabilitation and evidence-based clinical medicine.",
    experience_years: 9,
    license_number: "NMC-2015-5602",
    specializations: ["Orthopedics"],
    qualifications: [
      {
        degree_name: "MS Orthopedics",
        institution: "National Academy of Medical Sciences",
        graduation_date: "2015-12-10",
      },
    ],
    experience: [
      {
        organization: "B.P. Koirala Institute of Health Sciences",
        position: "Consultant Orthopedic Surgeon",
        start_date: "2016-06-20",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Harish Shah",
    email: "harish.shah@gmail.com",
    phone: "9841000011",
    date_of_birth: "1975-04-12",
    gender: "male",
    address: "Chabahil, Kathmandu",
    descriptions: "Highly experienced general medicine practitioner with 20 years of clinical care. Offers thorough outpatient diagnostic checks, preventative health screenings, and overall family medicine guidance. Focused on building strong, continuous patient relationships.",
    experience_years: 20,
    license_number: "NMC-2005-7701",
    specializations: ["General Medicine"],
    qualifications: [
      {
        degree_name: "MBBS",
        institution: "Manipal College of Medical Sciences",
        graduation_date: "2005-03-20",
      },
    ],
    experience: [
      {
        organization: "HAMS Hospital",
        position: "Senior General Practitioner",
        start_date: "2006-05-10",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Sujata Baral",
    email: "sujata.baral@gmail.com",
    phone: "9841000012",
    date_of_birth: "1983-08-30",
    gender: "female",
    address: "Gairidhara, Kathmandu",
    descriptions: "Internal medicine specialist expert in managing multi-system chronic conditions, complex metabolic disorders, geriatric healthcare, and diagnostic challenges. Emphasizes highly coordinated patient care and thorough lifestyle medicine interventions.",
    experience_years: 12,
    license_number: "NMC-2012-7702",
    specializations: ["Internal Medicine"],
    qualifications: [
      {
        degree_name: "MD Internal Medicine",
        institution: "Institute of Medicine, Tribhuvan University",
        graduation_date: "2012-07-25",
      },
    ],
    experience: [
      {
        organization: "Nepal Mediciti Hospital",
        position: "Consultant Physician",
        start_date: "2013-09-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Amit Bajracharya",
    email: "amit.bajracharya@gmail.com",
    phone: "9841000013",
    date_of_birth: "1980-03-15",
    gender: "male",
    address: "Patan, Lalitpur",
    descriptions: "Family medicine practitioner focusing on holistic long-term health management, lifestyle health counselling, preventative physical checkups, and general primary care. Highly trusted family doctor dedicated to the Kathmandu community.",
    experience_years: 15,
    license_number: "NMC-2009-8801",
    specializations: ["Family Medicine"],
    qualifications: [
      {
        degree_name: "MD General Practice & Family Medicine",
        institution: "Patan Academy of Health Sciences",
        graduation_date: "2009-06-18",
      },
    ],
    experience: [
      {
        organization: "Patan Hospital",
        position: "Consultant GP",
        start_date: "2009-08-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Maya Devi Devkota",
    email: "maya.devkota@gmail.com",
    phone: "9841000014",
    date_of_birth: "1979-10-21",
    gender: "female",
    address: "Lazimpat, Kathmandu",
    descriptions: "Compassionate psychiatrist specialized in managing anxiety disorders, major depressive illnesses, mood fluctuations, and comprehensive psychotherapeutic guidance. Dedicated to promoting mental health awareness and patient recovery.",
    experience_years: 17,
    license_number: "NMC-2007-9901",
    specializations: ["Psychiatry"],
    qualifications: [
      {
        degree_name: "MD Psychiatry",
        institution: "National Academy of Medical Sciences",
        graduation_date: "2007-12-10",
      },
    ],
    experience: [
      {
        organization: "Mental Hospital, Lagankhel",
        position: "Senior Consultant Psychiatrist",
        start_date: "2008-02-15",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Rajesh Manandhar",
    email: "rajesh.manandhar@gmail.com",
    phone: "9841000015",
    date_of_birth: "1976-11-05",
    gender: "male",
    address: "Kalimati, Kathmandu",
    descriptions: "Senior general surgeon specializing in abdominal surgeries, advanced laparoscopic procedures, and general surgical diagnostic consultations. Committed to providing top-quality pre-operative and post-operative clinical care.",
    experience_years: 19,
    license_number: "NMC-2005-5515",
    specializations: ["General Surgery"],
    qualifications: [
      {
        degree_name: "MS General Surgery",
        institution: "Institute of Medicine, Tribhuvan University",
        graduation_date: "2005-04-10",
      },
    ],
    experience: [
      {
        organization: "T.U. Teaching Hospital",
        position: "Senior Surgeon",
        start_date: "2005-09-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Deepak Bhattarai",
    email: "deepak.bhattarai@gmail.com",
    phone: "9841000016",
    date_of_birth: "1983-05-18",
    gender: "male",
    address: "Sanepa, Lalitpur",
    descriptions: "ENT specialist with 11 years of advanced surgical and clinical experience. Specializes in treating chronic sinus conditions, tonsil concerns, ear disorders, and overall neck-throat diagnostics. Focused on patient comfort and fast recovery.",
    experience_years: 11,
    license_number: "NMC-2013-6616",
    specializations: ["ENT"],
    qualifications: [
      {
        degree_name: "MS Otolaryngology (ENT)",
        institution: "Kathmandu University",
        graduation_date: "2013-03-12",
      },
    ],
    experience: [
      {
        organization: "Alka Hospital",
        position: "ENT Consultant",
        start_date: "2014-01-20",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Srijana Shrestha",
    email: "srijana.shrestha@gmail.com",
    phone: "9841000017",
    date_of_birth: "1985-02-14",
    gender: "female",
    address: "Gongabu, Kathmandu",
    descriptions: "Consultant ophthalmologist offering comprehensive vision diagnostics, modern cataract surgical assessments, refractive error corrections, and diabetic retinopathy screenings. Dedicated to preserving patient vision through early detection and care.",
    experience_years: 10,
    license_number: "NMC-2014-7717",
    specializations: ["Ophthalmology"],
    qualifications: [
      {
        degree_name: "MD Ophthalmology",
        institution: "National Academy of Medical Sciences",
        graduation_date: "2014-06-18",
      },
    ],
    experience: [
      {
        organization: "Tilganga Institute of Ophthalmology",
        position: "Attending Ophthalmologist",
        start_date: "2014-08-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Binod Pokharel",
    email: "binod.pokharel@gmail.com",
    phone: "9841000018",
    date_of_birth: "1981-09-08",
    gender: "male",
    address: "Maharajgunj, Kathmandu",
    descriptions: "Gastroenterologist skilled in evaluating digestive concerns, acid reflux management, chronic stomach conditions, and diagnostic endoscopies. Committed to promoting healthy gastrointestinal functions through evidence-based medicine.",
    experience_years: 13,
    license_number: "NMC-2011-8818",
    specializations: ["Gastroenterology"],
    qualifications: [
      {
        degree_name: "DM Gastroenterology",
        institution: "Institute of Medicine, Tribhuvan University",
        graduation_date: "2011-10-14",
      },
    ],
    experience: [
      {
        organization: "Nepal Mediciti Hospital",
        position: "Consultant Gastroenterologist",
        start_date: "2012-03-01",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Sunita Bhandari",
    email: "sunita.bhandari@gmail.com",
    phone: "9841000019",
    date_of_birth: "1984-12-05",
    gender: "female",
    address: "Jamsikhel, Lalitpur",
    descriptions: "Pulmonology expert diagnosing respiratory concerns, asthma and allergy management, chronic cough assessments, and lung health support. Dedicated to improving patient respiration and overall pulmonary wellness.",
    experience_years: 9,
    license_number: "NMC-2015-9919",
    specializations: ["Pulmonology"],
    qualifications: [
      {
        degree_name: "MD Pulmonary Medicine",
        institution: "B.P. Koirala Institute of Health Sciences",
        graduation_date: "2015-02-18",
      },
    ],
    experience: [
      {
        organization: "Civil Service Hospital",
        position: "Pulmonologist",
        start_date: "2015-08-10",
        end_date: null,
      },
    ],
  },
  {
    full_name: "Manish Rayamajhi",
    email: "manish.rayamajhi@gmail.com",
    phone: "9841000020",
    date_of_birth: "1982-06-25",
    gender: "male",
    address: "Teku, Kathmandu",
    descriptions: "Endocrinology consultant handling type 1 and type 2 diabetes management, thyroid function disorders, and metabolic health checks. Passionate about providing comprehensive patient education for long-term self-care.",
    experience_years: 12,
    license_number: "NMC-2012-0020",
    specializations: ["Endocrinology"],
    qualifications: [
      {
        degree_name: "DM Endocrinology",
        institution: "National Academy of Medical Sciences",
        graduation_date: "2012-11-20",
      },
    ],
    experience: [
      {
        organization: "Bir Hospital",
        position: "Consultant Endocrinologist",
        start_date: "2013-01-15",
        end_date: null,
      },
    ],
  },
];

const getUniqueValues = (items) => [...new Set(items)];

export const seed = async function (knex) {
  const passwordHash = await bcrypt.hash(DEFAULT_DOCTOR_PASSWORD, SALT_ROUNDS);
  const doctorEmails = doctorSeedData.map((doctor) => doctor.email);
  const specializationNames = getUniqueValues(
    doctorSeedData.flatMap((doctor) => doctor.specializations)
  );

  await knex.transaction(async (trx) => {
    // 1. Delete all transactional tables to prevent foreign key violations on re-seeding
    await trx("video_calls").del();
    await trx("appointment_messages").del();
    await trx("appointment_chat").del();
    await trx("appointment_records").del();
    await trx("appointments").del();
    await trx("notifications").del();
    await trx("reviews").del();
    await trx("assistant_messages").del();
    await trx("assistant_sessions").del();
    await trx("contact_messages").del();
    await trx("blog_tag_mappings").del();
    await trx("blogs").del();

    const specializationRows = await trx("specializations")
      .select("id", "name")
      .whereIn("name", specializationNames);

    const specializationMap = Object.fromEntries(
      specializationRows.map((specialization) => [specialization.name, specialization.id])
    );

    const missingSpecializations = specializationNames.filter(
      (name) => !specializationMap[name]
    );

    if (missingSpecializations.length > 0) {
      throw new Error(
        `Missing specializations for doctor seed: ${missingSpecializations.join(", ")}`
      );
    }

    const existingUsers = await trx("users").select("id").whereIn("email", doctorEmails);
    const existingDoctorIds = existingUsers.map((user) => user.id);

    if (existingDoctorIds.length > 0) {
      const assignmentIds = (
        await trx("doctor_hospital_assignments")
          .select("id")
          .whereIn("doctor_id", existingDoctorIds)
      ).map((assignment) => assignment.id);

      if (assignmentIds.length > 0) {
        const scheduleChangeRequestIds = (
          await trx("schedule_change_requests")
            .select("id")
            .whereIn("assignment_id", assignmentIds)
        ).map((request) => request.id);

        if (scheduleChangeRequestIds.length > 0) {
          await trx("schedule_change_request_availability")
            .whereIn("schedule_change_request_id", scheduleChangeRequestIds)
            .del();
          await trx("schedule_change_requests")
            .whereIn("id", scheduleChangeRequestIds)
            .del();
        }

        await trx("leave_requests").whereIn("assignment_id", assignmentIds).del();
        await trx("assignment_availability").whereIn("assignment_id", assignmentIds).del();
        await trx("doctor_hospital_assignments").whereIn("id", assignmentIds).del();
      }

      await trx("doctor_affiliation_requests")
        .whereIn("doctor_id", existingDoctorIds)
        .del();
      await trx("doctor_experience").whereIn("doctor_id", existingDoctorIds).del();
      await trx("doctor_qualifications").whereIn("doctor_id", existingDoctorIds).del();
      await trx("doctor_specializations").whereIn("doctor_id", existingDoctorIds).del();
      await trx("doctors").whereIn("id", existingDoctorIds).del();
      await trx("medical_records").whereIn("user_id", existingDoctorIds).del();
      await trx("auth_tokens").whereIn("user_id", existingDoctorIds).del();
    }

    await trx("auth_tokens").whereIn("email", doctorEmails).del();
    await trx("users").whereIn("email", doctorEmails).del();

    const userRows = doctorSeedData.map((doctor) => ({
      full_name: doctor.full_name,
      email: doctor.email,
      phone: doctor.phone,
      password: passwordHash,
      date_of_birth: doctor.date_of_birth,
      gender: doctor.gender,
      address: doctor.address,
      role: "doctor",
      status: "active",
      profile_picture: null,
    }));

    const insertedUsers = await trx("users")
      .insert(userRows)
      .returning(["id", "email"]);

    const userIdByEmail = Object.fromEntries(
      insertedUsers.map((user) => [user.email, user.id])
    );

    const doctorRows = doctorSeedData.map((doctor) => ({
      id: userIdByEmail[doctor.email],
      description: doctor.descriptions,
      experience_years: doctor.experience_years,
      license_number: doctor.license_number,
    }));

    const doctorSpecializationRows = doctorSeedData.flatMap((doctor) =>
      doctor.specializations.map((specializationName) => ({
        doctor_id: userIdByEmail[doctor.email],
        specialization_id: specializationMap[specializationName],
      }))
    );

    const doctorQualificationRows = doctorSeedData.flatMap((doctor) =>
      doctor.qualifications.map((qualification) => ({
        doctor_id: userIdByEmail[doctor.email],
        degree_name: qualification.degree_name,
        institution: qualification.institution,
        graduation_date: qualification.graduation_date,
      }))
    );

    const doctorExperienceRows = doctorSeedData.flatMap((doctor) =>
      doctor.experience.map((experience) => ({
        doctor_id: userIdByEmail[doctor.email],
        organization: experience.organization,
        position: experience.position,
        start_date: experience.start_date,
        end_date: experience.end_date,
      }))
    );

    await trx("doctors").insert(doctorRows);
    await trx("doctor_specializations").insert(doctorSpecializationRows);
    await trx("doctor_qualifications").insert(doctorQualificationRows);
    await trx("doctor_experience").insert(doctorExperienceRows);
  });
};
