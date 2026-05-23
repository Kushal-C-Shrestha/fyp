import pool from "../server/src/config/db.js";

async function main() {
    try {
        console.log("=== QUERYING USERS WITH ROLE 'doctor' ===");
        const { rows: users } = await pool.query(
            "SELECT id, full_name, email, role, status FROM users WHERE role = 'doctor'"
        );
        console.log(users);

        console.log("\n=== QUERYING DOCTORS TABLE ===");
        const { rows: doctors } = await pool.query(
            "SELECT id, experience_years, license_number FROM doctors"
        );
        console.log(doctors);

        console.log("\n=== QUERYING APPOINTMENTS ===");
        const { rows: appointments } = await pool.query(
            "SELECT id, patient_id, doctor_id, hospital_id, status, appointment_date, appointment_time FROM appointments"
        );
        console.log(appointments);

        console.log("\n=== QUERYING ASSIGNMENTS ===");
        const { rows: assignments } = await pool.query(
            "SELECT * FROM doctor_hospital_assignments"
        );
        console.log(assignments);
        
        process.exit(0);
    } catch (err) {
        console.error("Database query failed:", err);
        process.exit(1);
    }
}

main();
