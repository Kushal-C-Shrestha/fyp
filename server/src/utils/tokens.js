import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const REGISTRATION_TOKEN_SECRET = process.env.REGISTRATION_TOKEN_SECRET
const RESET_PASSWORD_TOKEN_SECRET = process.env.RESET_PASSWORD_TOKEN_SECRET;
const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN;
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN;
const REGISTRATION_TOKEN_EXPIRES_IN = process.env.REGISTRATION_TOKEN_EXPIRES_IN;
const RESET_PASSWORD_TOKEN_EXPIRES_IN = process.env.RESET_PASSWORD_TOKEN_EXPIRES_IN;




export const generateAccessToken = async (user) => {
    if (!user) throw new Error("User data is required to generate access token.");
    return jwt.sign(
        user,
        ACCESS_TOKEN_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
    );
};

export const generateRefreshToken = async (user) => {
    if (!user) throw new Error("User data is required to generate refresh token.");
    return jwt.sign(
        user,
        REFRESH_TOKEN_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
    );
};

export const generateRegistrationToken = async (email = {}) => {
    if (!email) throw new Error("Email is required to generate registration token.");
    return jwt.sign(
        { email },
        REGISTRATION_TOKEN_SECRET,
        { expiresIn: REGISTRATION_TOKEN_EXPIRES_IN }
    );
}


export const verifyRegistrationToken = async (token) => {
    if (!token) throw new Error("Registration token is required for verification.");
    return jwt.verify(
        token,
        REGISTRATION_TOKEN_SECRET
    );
}


export const generateResetToken = async (userId) => {
    if (!userId) throw new Error("User ID is required to generate reset token.");
    return jwt.sign(
        { id: userId },
        RESET_PASSWORD_TOKEN_SECRET,
        { expiresIn: RESET_PASSWORD_TOKEN_EXPIRES_IN }
    );
}

