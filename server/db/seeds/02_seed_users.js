import bcrypt from "bcrypt";

const SALT_ROUNDS = Number.parseInt(process.env.SALT_ROUNDS || "10", 10);
const ADMIN_PASSWORD = "Admin@123";
const PATIENT_PASSWORD = "Patient@123";

const superAdminUser = {
  full_name: "Rohit Gautam",
  email: "rohit.gautam@gmail.com",
  phone: "9871000001",
  date_of_birth: "1986-03-18",
  gender: "male",
  address: "Maitighar, Kathmandu",
  role: "admin",
  status: "active",
  profile_picture: null,
};

const patientUsers = [
  {
    full_name: "Aarati Shrestha",
    email: "aarati.shrestha@gmail.com",
    phone: "9851000001",
    date_of_birth: "1998-07-11",
    gender: "female",
    address: "Bhaktapur Durbar Square, Bhaktapur",
    role: "user",
    status: "active",
    profile_picture: null,
  },
  {
    full_name: "Bikram Kc",
    email: "bikram.kc@gmail.com",
    phone: "9851000002",
    date_of_birth: "1994-12-22",
    gender: "male",
    address: "Butwal, Rupandehi",
    role: "user",
    status: "active",
    profile_picture: null,
  },
  {
    full_name: "Neha Poudel",
    email: "neha.poudel@gmail.com",
    phone: "9851000003",
    date_of_birth: "2000-01-30",
    gender: "female",
    address: "Bharatpur, Chitwan",
    role: "user",
    status: "active",
    profile_picture: null,
  },
  {
    full_name: "Sujan Lama",
    email: "sujan.lama@gmail.com",
    phone: "9851000004",
    date_of_birth: "1996-05-14",
    gender: "male",
    address: "Kalanki, Kathmandu",
    role: "user",
    status: "active",
    profile_picture: null,
  },
  {
    full_name: "Mina Koirala",
    email: "mina.koirala@gmail.com",
    phone: "9851000005",
    date_of_birth: "1992-09-27",
    gender: "female",
    address: "Dharan, Sunsari",
    role: "user",
    status: "active",
    profile_picture: null,
  },
  {
    full_name: "Ritesh Thapa",
    email: "ritesh.thapa@gmail.com",
    phone: "9851000006",
    date_of_birth: "1989-11-08",
    gender: "male",
    address: "Pokhara, Kaski",
    role: "user",
    status: "active",
    profile_picture: null,
  },
];

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export const seed = async function (knex) {
  const [adminPasswordHash, patientPasswordHash] = await Promise.all([
    bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS),
    bcrypt.hash(PATIENT_PASSWORD, SALT_ROUNDS),
  ]);

  const rows = [
    {
      ...superAdminUser,
      password: adminPasswordHash,
    },
    ...patientUsers.map((user) => ({
      ...user,
      password: patientPasswordHash,
    })),
  ];

  await knex("users")
    .insert(rows)
    .onConflict("email")
    .merge([
      "full_name",
      "phone",
      "password",
      "date_of_birth",
      "gender",
      "address",
      "profile_picture",
      "role",
      "status",
      "updated_at",
    ]);
};
