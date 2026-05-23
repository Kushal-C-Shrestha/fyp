import express from "express";
import {
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
} from "../controllers/auth.controller.js";
import { getMeSettings, updateMeSettings, uploadUserProfilePicture, deleteUserProfilePicture } from "../controllers/user.controller.js";
import { rateLimiter } from "../middlewares/rateLimit.middleware.js";
import { authenticateUser } from "../middlewares/auth.middleware.js";
import createUpload from "../middlewares/upload.middleware.js";

const router = express.Router();

router.post('/login',
    rateLimiter({ prefix: "login", max: 10, windowSec: 900 }),
    loginUser
);

// Registration: 5 per IP per hour to limit account-farming
router.post('/register',
    rateLimiter({ prefix: "register", max: 5, windowSec: 3600 }),
    registerUser
);
// OTP send/verify: 5 sends per email per 10 minutes
router.post('/register/send-otp',
    rateLimiter({ prefix: "reg-otp-send", max: 5, windowSec: 600 }),
    sendRegisterOtp
);
router.post('/register/verify-otp',
    rateLimiter({ prefix: "reg-otp-verify", max: 10, windowSec: 600 }),
    verifyRegisterOtp
);
router.post('/register/resend-otp',
    rateLimiter({ prefix: "reg-otp-resend", max: 5, windowSec: 600 }),
    resendRegisterOtp
);

router.post('/forgot-password/send-otp',
    rateLimiter({ prefix: "pw-otp-send", max: 5, windowSec: 600 }),
    sendPasswordResetOtp
);
router.post('/forgot-password/verify-otp',
    rateLimiter({ prefix: "pw-otp-verify", max: 10, windowSec: 600 }),
    verifyPasswordResetOtp
);
router.post('/forgot-password/resend-otp',
    rateLimiter({ prefix: "pw-otp-resend", max: 5, windowSec: 600 }),
    resendPasswordResetOtp
);
router.post('/forgot-password/reset-password',
    rateLimiter({ prefix: "pw-reset", max: 5, windowSec: 600 }),
    resetPassword
);

router.post('/google',
    rateLimiter({ prefix: "google-oauth", max: 10, windowSec: 900 }),
    googleOAuth
);

router.post('/refresh', refreshToken);
router.post('/logout', logoutUser);

router.get('/me/settings', authenticateUser, getMeSettings);
router.put('/me/settings', authenticateUser, updateMeSettings);
router.post('/me/profile-picture', authenticateUser, createUpload({ folder: "avatars" }).single("profile_picture"), uploadUserProfilePicture);
router.delete('/me/profile-picture', authenticateUser, deleteUserProfilePicture);

export default router;
