import pool from "../config/db.js";

export const getAllSpecialities = async () => {
    try {
        const { rows } = await pool.query('SELECT * FROM specializations');
        return { specialities: rows };
    } catch (error) {
        console.error('Error fetching specialities:', error);
        const err = new Error('Failed to fetch specialities');
        err.status = 500;
        throw err;
    }
};