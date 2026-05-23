import pool from "../config/db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);

export async function getUserSettings(userId) {
  const { rows } = await pool.query(
    "SELECT id, full_name, email, phone, gender, date_of_birth, address, profile_picture FROM users WHERE id = $1 LIMIT 1",
    [userId]
  );

  if (rows.length === 0) {
    throw { status: 404, message: "User not found." };
  }

  const user = rows[0];

  return {
    account: {
      fullName: user.full_name,
      email: user.email,
      phone: user.phone,
      gender: user.gender,
      dateOfBirth: user.date_of_birth,
      address: user.address,
      profile_picture: user.profile_picture || "",
    },
  };
}

export async function updateUserSettings(userId, payload) {
  const { account, security } = payload;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Update basic account info
    if (account) {
      await client.query(
        `UPDATE users SET
          full_name = COALESCE($1, full_name),
          email = COALESCE($2, email),
          phone = COALESCE($3, phone),
          gender = COALESCE($4, gender),
          date_of_birth = COALESCE($5, date_of_birth),
          address = COALESCE($6, address)
        WHERE id = $7`,
        [
          account.fullName,
          account.email,
          account.phone,
          account.gender,
          account.dateOfBirth,
          account.address,
          userId,
        ]
      );
    }

    // 2. Update password if requested
    if (security?.newPassword) {
      if (!security.currentPassword) {
        throw { status: 400, message: "Current password is required to set a new one." };
      }

      const { rows: userRows } = await client.query("SELECT password FROM users WHERE id = $1", [userId]);
      const user = userRows[0];

      const isMatch = await bcrypt.compare(security.currentPassword, user.password);
      if (!isMatch) {
        throw { status: 403, message: "The current password you entered is incorrect." };
      }

      const hashedPassword = await bcrypt.hash(security.newPassword, SALT_ROUNDS);
      await client.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, userId]);
    }

    await client.query("COMMIT");

    // Fetch updated user to return
    const { rows: updatedRows } = await client.query(
      "SELECT id, full_name, email, phone, gender, date_of_birth, address, role, profile_picture FROM users WHERE id = $1",
      [userId]
    );
    const updatedUser = updatedRows[0];

    return {
      message: "Settings updated successfully.",
      settings: {
        account: {
          fullName: updatedUser.full_name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          gender: updatedUser.gender,
          dateOfBirth: updatedUser.date_of_birth,
          address: updatedUser.address,
          profile_picture: updatedUser.profile_picture || "",
        },
      },
      user: {
        id: updatedUser.id,
        name: updatedUser.full_name,
        full_name: updatedUser.full_name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.date_of_birth,
        address: updatedUser.address,
        profile_picture: updatedUser.profile_picture || "",
      },
    };
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      throw { status: 409, message: "Email or phone number already in use." };
    }
    throw error;
  } finally {
    client.release();
  }
}
