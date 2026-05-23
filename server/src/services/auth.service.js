import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import axios from "axios";
import dotenv from "dotenv";
import pool from "../config/db.js";
import {
    generateAccessToken,
    generateRefreshToken,
    generateRegistrationToken,
    generateResetToken,
    verifyRegistrationToken,
} from "../utils/tokens.js";
import { generateOtp } from "../utils/otp.js";
import { isValidEmail } from "../utils/validation.js";

import { sendOtpEmail } from "./email.service.js";

dotenv.config();

const SALT_ROUNDS = Number(process.env.SALT_ROUNDS || 10);

export async function login(payload = {}) {
    const username = String(payload?.username ?? payload?.email ?? payload?.phone ?? "").trim();
    const password = String(payload?.password ?? "");

    if (!username || !password) {
        throw { status: 400, message: "Username and password are required." };
    }

    const { rows } = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1",
        [username]
    );

    if (rows.length === 0) {
        throw { status: 404, message: "The user does not exist." };
    }

    const user = rows[0];
    const ok = await bcrypt.compare(password, user.password);

    if (!ok) {
        throw { status: 403, message: "The password does not match." };
    }

    return {
        accessToken: await generateAccessToken(user),
        refreshToken: await generateRefreshToken(user),
        user: {
            id: user.id,
            name: user.full_name,
            email: user.email,
            role: user.role,
            profile_picture: user.profile_picture,
        },
    };
}

export async function register({ fullname, email, phone, password, dateOfBirth, gender, address, registrationToken, publicKey, encryptedPrivateKey }) {
    const role = "user";
    const status = "active";
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const isValidToken = await verifyRegistrationToken(registrationToken);

    if (!isValidToken) {
        throw { status: 400, message: "Invalid or expired registration token." };
    }

    try {
        await pool.query(
            `INSERT INTO users (full_name, email, phone, password, date_of_birth, gender, address, role, status, public_key, encrypted_private_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
            [fullname, email, phone, hashedPassword, dateOfBirth, gender, address, role, status, publicKey, encryptedPrivateKey]
        );
        return { success: true, status: 201, message: "Account created successfully." };
    } catch (error) {
        if (error.code === "23505") {
            if (error.constraint === "users_email_unique") {
                throw { success: false, status: 409, message: "Email already exists" };
            }
            if (error.constraint === "users_phone_unique") {
                throw { success: false, status: 409, message: "Phone already exists" };
            }
        }
        throw { success: false, status: 500, message: "Server error" };
    }
}

export async function refresh(refreshToken) {
    if (!refreshToken) {
        throw { status: 401, message: "Refresh token missing." };
    }

    let decoded;
    try {
        decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    } catch {
        throw { status: 401, message: "Invalid refresh token." };
    }

    const { rows } = await pool.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [decoded?.id]);

    if (rows.length === 0) {
        throw { status: 404, message: "The user does not exist." };
    }

    const user = rows[0];

    return {
        accessToken: await generateAccessToken(user),
        refreshToken: await generateRefreshToken(user),
        user: {
            id: user.id,
            name: user.full_name,
            email: user.email,
            role: user.role,
            profile_picture: user.profile_picture,
        },
    };
}

export async function sendRegisterOtp(payload = {}) {
    if (!payload?.email) {
        throw { status: 400, message: "Email is required." };
    }

    if (!isValidEmail(payload.email)) {
        throw { status: 400, message: "Invalid email format." };
    }

    try {
        const email = String(payload.email).trim().toLowerCase();
        const phone = payload.phone ? String(payload.phone).trim() : null;

        // Check email duplicate
        const { rows: existingUsers } = await pool.query("SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1", [email]);
        if (existingUsers.length > 0) {
            throw { status: 409, message: "Email already exists." };
        }

        // Check phone duplicate up-front so the user doesn't get stuck after OTP
        if (phone) {
            const { rows: existingPhone } = await pool.query("SELECT id FROM users WHERE phone = $1 LIMIT 1", [phone]);
            if (existingPhone.length > 0) {
                throw { status: 409, message: "Phone number already exists." };
            }
        }

        // Check if otp has alredy been issued for this email.
        const { rows: existingOtps } = await pool.query(
            `SELECT * FROM auth_tokens
         WHERE LOWER(email) = LOWER($1)
           AND purpose = $2
           AND type = $3
           AND expires_at > NOW()
           AND COALESCE(is_used, false) = false
         ORDER BY created_at DESC, id DESC`,
            [email, "registration", "otp"]
        );

        if (existingOtps.length > 0) {
            throw {
                status: 429,
                message: "An OTP has already been sent to this email. Please wait before requesting another one.",
            };
        }

        // Generating the otp and hashing it.
        const otp = generateOtp();
        const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
        await pool.query(
            `INSERT INTO auth_tokens (email, code, purpose, type, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
            [
                email,
                hashedOtp,
                "registration",
                "otp",
                new Date(Date.now() + 5 * 60 * 1000),
            ]
        );

        // Sending the OTP email to the user.
        await sendOtpEmail({
            to: email,
            otp,
            expiresIn: 5,
            purpose: "registration",
        });

        return {
            success: true,
            status: 200,
            message: "OTP sent successfully."
        };
    } catch (error) {
        console.error("Error in sendRegisterOtp:", error);
        throw { status: error.status || 500, message: error.message || "Unable to send OTP." };
    }

}

export async function resendRegisterOtp({ email }) {
    if (!email || !isValidEmail(email)) {
        throw { status: 400, message: "A valid email is required." };
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Make sure the email isn't already registered
    const { rows: existingUsers } = await pool.query(
        "SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1",
        [normalizedEmail]
    );
    if (existingUsers.length > 0) {
        throw { status: 409, message: "Email already exists." };
    }

    // Invalidate all pending OTPs for this email so we can send a fresh one
    await pool.query(
        `UPDATE auth_tokens SET is_used = true
         WHERE LOWER(email) = LOWER($1) AND purpose = 'registration' AND type = 'otp' AND COALESCE(is_used, false) = false`,
        [normalizedEmail]
    );

    // Generate and send new OTP
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
    await pool.query(
        `INSERT INTO auth_tokens (email, code, purpose, type, expires_at)
         VALUES ($1, $2, 'registration', 'otp', $3)`,
        [normalizedEmail, hashedOtp, new Date(Date.now() + 5 * 60 * 1000)]
    );

    await sendOtpEmail({ to: normalizedEmail, otp, expiresIn: 5, purpose: "registration" });

    return { success: true, message: "OTP resent successfully." };
}

export async function verifyRegisterOtp({ email, otp }) {
    if (!email || !otp) {
        throw { status: 400, message: "Email and OTP are required." };
    }

    try {
        // First check if any OTP exists for this email at all (regardless of state)
        const { rows: anyRows } = await pool.query(
            `SELECT * FROM auth_tokens
             WHERE LOWER(email) = LOWER($1) AND purpose = $2 AND type = $3
             ORDER BY created_at DESC, id DESC LIMIT 1`,
            [email, "registration", "otp"]
        );

        if (anyRows.length === 0) {
            throw { status: 404, message: "No OTP was found for this email. Please request a new one." };
        }

        const latest = anyRows[0];

        if (latest.is_used) {
            throw { status: 410, message: "This OTP has already been used. Please request a new one." };
        }

        if (new Date(latest.expires_at) < new Date()) {
            throw { status: 410, message: "Your OTP has expired. Please request a new one." };
        }

        const tokenRecord = latest;
        const isValidOtp = await bcrypt.compare(otp, tokenRecord.code);

        if (!isValidOtp) {
            throw { status: 400, message: "Incorrect OTP. Please try again." };
        }

        await pool.query("UPDATE auth_tokens SET is_used = true WHERE id = $1", [tokenRecord.id]);
        const registrationToken = await generateRegistrationToken(tokenRecord.email);
        return { success: true, status: 200, message: "OTP verified successfully.", token: registrationToken };
    } catch (error) {
        throw { status: error.status || 500, message: error.message || "Unable to verify OTP." };
    }

}

export async function sendPasswordResetOtp({ identifier }) {
    // checking if identifier is email or phone
    if (!identifier) {
        throw { status: 400, message: "Email or phone is required." };
    }

    // Checking if the requested user exists.
    const userResult = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1",
        [identifier]
    );

    if (userResult.rows.length === 0) {
        throw { status: 404, message: "No user found with this email or phone." };
    }

    // Checking if an otp has already been sent for the user.
    const user = userResult.rows[0];
    const existingOtp = await pool.query(
        `SELECT * FROM auth_tokens
         WHERE LOWER(email) = LOWER($1)
           AND purpose = $2
           AND type = $3
           AND expires_at > NOW()
           AND COALESCE(is_used, false) = false
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [user.email, 'reset-password', 'otp']
    );

    if (existingOtp.rows.length > 0) {
        throw {
            success: false,
            status: 429,
            message: "An OTP has already been sent to this email. Please wait before requesting another one.",
        };
    }

    // Creating and sending an OTP for the reset.
    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);

    await pool.query(
        `INSERT INTO auth_tokens (email, user_id, code, purpose, type, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            user.email,
            user.id,
            hashedOtp,
            'reset-password',
            'otp',
            new Date(Date.now() + 5 * 60 * 1000),
        ]
    );

    // Sending the OTP email to the user.
    await sendOtpEmail({
        to: user.email,
        otp,
        expiresIn: 5,
        purpose: "reset-password",
    });

    return {
        success: true,
        status: 201,
        message: "OTP sent successfully.",
    };
}

export async function resendPasswordResetOtp({ identifier }) {
    if (!identifier) {
        throw { status: 400, message: "Email or phone is required." };
    }

    const userResult = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1",
        [identifier]
    );

    if (userResult.rows.length === 0) {
        throw { status: 404, message: "No user found with this email or phone." };
    }

    const user = userResult.rows[0];

    // Invalidate any pending OTPs so we can issue a fresh one
    await pool.query(
        `UPDATE auth_tokens SET is_used = true
         WHERE LOWER(email) = LOWER($1) AND purpose = 'reset-password' AND type = 'otp' AND COALESCE(is_used, false) = false`,
        [user.email]
    );

    const otp = generateOtp();
    const hashedOtp = await bcrypt.hash(otp, SALT_ROUNDS);
    await pool.query(
        `INSERT INTO auth_tokens (email, user_id, code, purpose, type, expires_at)
         VALUES ($1, $2, $3, 'reset-password', 'otp', $4)`,
        [user.email, user.id, hashedOtp, new Date(Date.now() + 5 * 60 * 1000)]
    );

    await sendOtpEmail({ to: user.email, otp, expiresIn: 5, purpose: "reset-password" });

    return { success: true, message: "OTP resent successfully." };
}

export async function verifyPasswordResetOtp({ identifier, otp }) {
    // Checking the required fields.
    if (!identifier) {
        throw { status: 400, message: "Email or phone is required." };
    }

    if (!otp) {
        throw { status: 400, message: "OTP is required." };
    }

    // Checking if the requested user exists.
    const userResult = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1 LIMIT 1",
        [identifier]
    );

    if (userResult.rows.length === 0) {
        throw { status: 404, message: "No user found with this email or phone." };
    }

    const user = userResult.rows[0];

    // Fetch the latest OTP regardless of state so we can give specific errors
    const tokenResult = await pool.query(
        `SELECT * FROM auth_tokens
         WHERE LOWER(email) = LOWER($1) AND purpose = $2 AND type = $3
         ORDER BY created_at DESC, id DESC LIMIT 1`,
        [user.email, 'reset-password', 'otp']
    );

    if (tokenResult.rows.length === 0) {
        throw { status: 404, message: "No OTP was found for this email. Please request a new one." };
    }

    const tokenRecord = tokenResult.rows[0];

    if (tokenRecord.is_used) {
        throw { status: 410, message: "This OTP has already been used. Please request a new one." };
    }

    if (new Date(tokenRecord.expires_at) < new Date()) {
        throw { status: 410, message: "Your OTP has expired. Please request a new one." };
    }

    const isValidOtp = await bcrypt.compare(otp, tokenRecord.code);

    if (!isValidOtp) {
        throw { status: 400, message: "Incorrect OTP. Please try again." };
    }

    // Generating a reset token and marking the otp as used.
    const resetToken = await generateResetToken(user.id);
    const hashedToken = await bcrypt.hash(resetToken, SALT_ROUNDS);
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        await client.query("UPDATE auth_tokens SET is_used = true WHERE id = $1", [tokenRecord.id]);
        await client.query(
            `INSERT INTO auth_tokens (email, user_id, code, purpose, type, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                user.email,
                user.id,
                hashedToken,
                'reset-password',
                'token',
                new Date(Date.now() + 5 * 60 * 1000),
            ]
        );
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }

    return { success: true, message: "OTP verified successfully.", token: resetToken };
}

export async function googleOAuthLogin({ accessToken }) {
    if (!accessToken) {
        throw { status: 400, message: "Google access token is required." };
    }

    // Verify the access token and fetch user info from Google
    let googleUser;
    try {
        const { data } = await axios.get("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        googleUser = data;
    } catch {
        throw { status: 401, message: "Invalid or expired Google token." };
    }

    const email = String(googleUser?.email || "").trim().toLowerCase();
    const name = String(googleUser?.name || googleUser?.given_name || "").trim();

    if (!email || !googleUser?.email_verified) {
        throw { status: 400, message: "Google account email is not verified." };
    }

    // Check if user already exists
    const { rows } = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1",
        [email]
    );

    if (rows.length > 0) {
        const user = rows[0];
        return {
            accessToken: await generateAccessToken(user),
            refreshToken: await generateRefreshToken(user),
            user: { id: user.id, name: user.full_name, email: user.email, role: user.role, profile_picture: user.profile_picture },
        };
    }

    // If user doesnt exist.
    throw { status: 404, message: "No account is associated with this Google email. Please register first." };
}

export async function resetPassword({ confirmPassword, newPassword, resetToken }) {
    if (!resetToken || !newPassword) {
        throw { status: 400, message: "Reset token and new password are required." };
    }

    let decodedToken;
    try {
        decodedToken = jwt.verify(resetToken, process.env.RESET_PASSWORD_TOKEN_SECRET);
    } catch {
        throw { status: 400, message: "Invalid reset token." };
    }

    const { rows } = await pool.query(
        `SELECT * FROM auth_tokens
         WHERE user_id = $1
           AND purpose = $2
           AND type = $3
           AND expires_at > NOW()
           AND COALESCE(is_used, false) = false
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [decodedToken?.id, 'reset-password', 'token']
    );

    if (rows.length === 0) {
        throw { status: 404, message: "Invalid or expired reset token." };
    }

    const tokenRecord = rows[0];
    const isValidToken = await bcrypt.compare(resetToken, tokenRecord.code);

    if (!isValidToken) {
        throw { status: 400, message: "Invalid reset token." };
    }

    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await pool.query("UPDATE users SET password = $1 WHERE id = $2", [hashedPassword, tokenRecord.user_id]);
    await pool.query("UPDATE auth_tokens SET is_used = true WHERE id = $1", [tokenRecord.id]);

    return { success: true, message: "Password reset successfully." };
}
