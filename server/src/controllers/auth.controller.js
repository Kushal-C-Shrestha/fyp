import * as authService from "../services/auth.service.js";
import { isValidEmail, isValidPassword, isValidPhone, isNonEmptyString } from "../utils/validation.js";

const getBaseUrl = (req) => `${req.protocol}://${req.get("host")}`;

const resolveUrl = (filePath, req) => {
    if (!filePath) return "";
    if (/^https?:\/\//i.test(filePath)) return filePath;
    const normalized = filePath.startsWith("/") ? filePath : `/${filePath}`;
    return `${getBaseUrl(req)}${normalized}`;
};

const loginUser = async (req, res) => {
    const { username = '', password = '' } = req.body || {};

    if (!username) return res.status(404).json({ message: "Email or phone is missing." });
    if (!password) return res.status(404).json({ message: "Password is missing." });

    if (!(isValidEmail(username) || isValidPhone(username))) return res.status(400).json({ message: "The username is not valid." });
    if (!(isValidPassword(password))) return res.status(400).json({ message: "The password is not valid." });

    try {
        const { accessToken, refreshToken, user } = await authService.login({ username, password });
        if (!accessToken) return res.status(404).json({ message: "The user does not exist." });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/"
        });

        return res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile_picture: resolveUrl(user.profile_picture, req)
            }
        });
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Server error" });
    }
};

const registerUser = async (req, res) => {
    const { fullname = '', email = '', phone = '', password = '', confirmPassword = '', dateOfBirth = '', gender = '', address = '', registrationToken = '', publicKey = '', encryptedPrivateKey = '' } = req.body || {};
    if (!isNonEmptyString(fullname)) return res.status(400).json({ message: "Full name missing" });

    if (!isNonEmptyString(email)) return res.status(400).json({ message: "Email missing" });
    if (!isValidEmail(email)) return res.status(400).json({ message: "Wrong email" });

    if (phone && !isNonEmptyString(phone)) return res.status(400).json({ message: "Phone number is missing" });
    if (phone && !isValidPhone(phone)) return res.status(400).json({ message: "Invalid phone number" });

    if (!isNonEmptyString(password)) return res.status(400).json({ message: "Password missing" });
    if (!isValidPassword(password)) return res.status(400).json({ message: "Password is too weak" });

    if (!isNonEmptyString(confirmPassword)) return res.status(400).json({ message: "Confirm password missing" });

    if (!(password === confirmPassword)) return res.status(400).json({ message: "The passwords do not match." });

    if (!registrationToken) return res.status(400).json({ message: "Registration token is missing." });
    try {
        await authService.register({ fullname, email, phone, password, dateOfBirth, gender, address, registrationToken, publicKey, encryptedPrivateKey });
        return res.status(201).json({ success: true, message: "User registered successfully" });
    } catch (error) {
        return res.status(error.status || 500).json({ success: false, message: error.message || "Server error" });
    }
};

const refreshToken = async (req, res) => {
    const token =
        req?.cookies?.refreshToken ||
        req?.body?.refreshToken ||
        null;

    if (!token) {
        return res.status(401).json({ message: "Refresh token missing" });
    }

    try {
        const { accessToken, refreshToken: nextRefreshToken, user } = await authService.refresh(token);

        if (nextRefreshToken) {
            res.cookie("refreshToken", nextRefreshToken, {
                httpOnly: true,
                maxAge: 7 * 24 * 60 * 60 * 1000,
                path: "/"
            });
        }

        return res.status(200).json({
            accessToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                profile_picture: resolveUrl(user.profile_picture, req)
            }
        });
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Invalid or expired refresh token" });
    }
};

const logoutUser = async (_req, res) => {
    res.clearCookie("refreshToken", {
        httpOnly: true,
        path: "/"
    });
    return res.status(200).json({ message: "Logged out successfully." });
};

const sendRegisterOtp = async (req, res) => {
    try {
        const result = await authService.sendRegisterOtp(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to send OTP." });
    }
};

const resendRegisterOtp = async (req, res) => {
    try {
        const result = await authService.resendRegisterOtp(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to resend OTP." });
    }
};

const verifyRegisterOtp = async (req, res) => {
    const { email, otp } = req.body || {};
    if (!isNonEmptyString(email) || !isValidEmail(email)) {
        return res.status(400).json({ message: "Invalid email." });
    }
    if (!isNonEmptyString(otp) || otp.length !== 6) {
        return res.status(400).json({ message: "Invalid OTP." });
    }
    try {
        const result = await authService.verifyRegisterOtp({ email, otp });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to verify OTP." });
    }
};


const sendPasswordResetOtp = async (req, res) => {
    try {
        const result = await authService.sendPasswordResetOtp(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to send reset OTP." });
    }
};

const verifyPasswordResetOtp = async (req, res) => {
    try {
        const result = await authService.verifyPasswordResetOtp(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to verify reset OTP." });
    }
};

const resendPasswordResetOtp = async (req, res) => {
    try {
        const result = await authService.resendPasswordResetOtp(req.body || {});
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to resend reset OTP." });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { newPassword, confirmPassword, resetToken } = req.body || {};
        if (!isNonEmptyString(newPassword) || !isValidPassword(newPassword)) {
            return res.status(400).json({ message: "Invalid new password." });
        }
        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "The passwords do not match." });
        }
        if (!isNonEmptyString(resetToken)) {
            return res.status(400).json({ message: "Reset token is missing." });
        }
        const result = await authService.resetPassword({ newPassword, confirmPassword, resetToken });
        return res.status(200).json(result);
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Unable to reset password." });
    }
};

const googleOAuth = async (req, res) => {
    try {
        const { accessToken } = req.body || {};
        if (!accessToken) {
            return res.status(400).json({ message: "Google access token is required." });
        }
        const result = await authService.googleOAuthLogin({ accessToken });
        res.cookie("refreshToken", result.refreshToken, {
            httpOnly: true,
            maxAge: 7 * 24 * 60 * 60 * 1000,
            path: "/",
        });
        const user = { ...result.user };
        user.profile_picture = resolveUrl(user.profile_picture, req);
        return res.status(200).json({
            accessToken: result.accessToken,
            user,
        });
    } catch (error) {
        return res.status(error.status || 500).json({ message: error.message || "Google authentication failed." });
    }
};

export {
    loginUser,
    registerUser,
    refreshToken,
    logoutUser,
    sendRegisterOtp,
    resendRegisterOtp,
    verifyRegisterOtp,
    sendPasswordResetOtp,
    verifyPasswordResetOtp,
    resendPasswordResetOtp,
    resetPassword,
    googleOAuth,
};
