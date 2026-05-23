import { z } from "zod";
import { isValidEmail, isValidPassword, isValidPhone } from "./validation.js";

const OTP_REGEX = /^\d{4,8}$/;

const toFirstIssueError = (error) => {
    const issue = error?.issues?.[0];
    const message = issue?.message || "Invalid request data.";
    const validationError = new Error(message);
    validationError.status = 400;
    validationError.details = error?.flatten?.() || null;
    return validationError;
};

const parseWithSchema = (schema, payload) => {
    const parsed = schema.safeParse(payload || {});
    if (!parsed.success) throw toFirstIssueError(parsed.error);
    return parsed.data;
};

const normalizeIdentifier = (payload = {}) => {
    return String(
        payload?.identifier ??
        payload?.username ??
        payload?.email ??
        payload?.phone ??
        ""
    ).trim();
};

const identifierSchema = z
    .string()
    .trim()
    .min(1, "Email or phone is required.")
    .refine((value) => isValidEmail(value) || isValidPhone(value), "Email or phone is not valid.")
    .transform((value) => (isValidEmail(value) ? value.toLowerCase() : value));

const loginPasswordSchema = z
    .string()
    .trim()
    .min(1, "Password is required.")
    .refine((value) => isValidPassword(value), "The password is not valid.");

const strongPasswordSchema = z
    .string()
    .trim()
    .min(1, "Password missing")
    .refine((value) => isValidPassword(value), "Password is too weak");

const registerSchema = z
    .object({
        fullname: z.string().trim().min(1, "Full name missing"),
        email: z
            .string()
            .trim()
            .min(1, "Email missing")
            .refine((value) => isValidEmail(value), "Wrong email")
            .transform((value) => value.toLowerCase()),
        phone: z
            .string()
            .trim()
            .min(1, "Phone number is missing")
            .refine((value) => isValidPhone(value), "Invalid phone number"),
        password: strongPasswordSchema,
        confirmPassword: z.string().trim().min(1, "Confirm password missing"),
        dateOfBirth: z.string().trim().min(1, "Date of birth is missing."),
        gender: z
            .string()
            .trim()
            .min(1, "Gender is missing.")
            .transform((value) => value.toLowerCase())
            .refine((value) => ["male", "female", "other"].includes(value), "Invalid gender value."),
    })
    .superRefine((value, context) => {
        if (value.password !== value.confirmPassword) {
            context.addIssue({
                path: ["confirmPassword"],
                code: z.ZodIssueCode.custom,
                message: "The passwords do not match.",
            });
        }
    })
    .transform((value) => ({
        fullname: value.fullname,
        email: value.email,
        phone: value.phone,
        password: value.password,
        dateOfBirth: value.dateOfBirth,
        gender: value.gender,
    }));

const otpSchema = z
    .string()
    .trim()
    .min(1, "OTP is required.")
    .refine((value) => OTP_REGEX.test(value), "OTP format is invalid.");

const pendingIdSchema = z.string().trim().min(1, "pendingId is required.");

const verifyRegisterOtpSchema = z.object({
    pendingId: pendingIdSchema,
    otp: otpSchema,
});

const resendRegisterOtpSchema = z.object({
    pendingId: pendingIdSchema,
});

const forgotPasswordSchema = z.object({
    identifier: identifierSchema,
});

const verifyPasswordResetOtpSchema = z.object({
    identifier: identifierSchema,
    otp: otpSchema,
});

const resetPasswordSchema = z
    .object({
        resetToken: z.string().trim().min(1, "Reset token is required."),
        newPassword: strongPasswordSchema,
        confirmPassword: z.string().trim().min(1, "Confirm password missing"),
    })
    .superRefine((value, context) => {
        if (value.newPassword !== value.confirmPassword) {
            context.addIssue({
                path: ["confirmPassword"],
                code: z.ZodIssueCode.custom,
                message: "The passwords do not match.",
            });
        }
    })
    .transform((value) => ({
        resetToken: value.resetToken,
        newPassword: value.newPassword,
    }));

const accountSettingsSchema = z
    .object({
        account: z
            .object({
                fullName: z.string().trim().min(1, "Full name is required.").optional(),
                email: z
                    .string()
                    .trim()
                    .min(1, "Email is required.")
                    .refine((value) => isValidEmail(value), "Wrong email")
                    .transform((value) => value.toLowerCase())
                    .optional(),
                phone: z
                    .string()
                    .trim()
                    .min(1, "Phone number is required.")
                    .refine((value) => isValidPhone(value), "Invalid phone number")
                    .optional(),
                gender: z
                    .string()
                    .trim()
                    .min(1, "Gender is required.")
                    .transform((value) => value.toLowerCase())
                    .refine((value) => ["male", "female", "other"].includes(value), "Invalid gender value.")
                    .optional(),
                dateOfBirth: z.string().trim().min(1, "Date of birth is required.").optional(),
                address: z.string().trim().min(1, "Address is required.").optional(),
            })
            .default({}),
        security: z
            .object({
                currentPassword: z.string().trim().optional().default(""),
                newPassword: z.string().trim().optional().default(""),
                confirmPassword: z.string().trim().optional().default(""),
            })
            .default({}),
    })
    .superRefine((value, context) => {
        const security = value.security || {};
        const currentPassword = String(security.currentPassword || "").trim();
        const newPassword = String(security.newPassword || "").trim();
        const confirmPassword = String(security.confirmPassword || "").trim();
        const isPasswordUpdateRequested = Boolean(currentPassword || newPassword || confirmPassword);

        if (!isPasswordUpdateRequested) return;

        if (!currentPassword) {
            context.addIssue({
                path: ["security", "currentPassword"],
                code: z.ZodIssueCode.custom,
                message: "Current password is required.",
            });
        }

        if (!newPassword) {
            context.addIssue({
                path: ["security", "newPassword"],
                code: z.ZodIssueCode.custom,
                message: "New password is required.",
            });
        } else if (!isValidPassword(newPassword)) {
            context.addIssue({
                path: ["security", "newPassword"],
                code: z.ZodIssueCode.custom,
                message: "Password is too weak",
            });
        }

        if (!confirmPassword) {
            context.addIssue({
                path: ["security", "confirmPassword"],
                code: z.ZodIssueCode.custom,
                message: "Confirm password missing",
            });
        } else if (newPassword !== confirmPassword) {
            context.addIssue({
                path: ["security", "confirmPassword"],
                code: z.ZodIssueCode.custom,
                message: "The passwords do not match.",
            });
        }
    })
    .transform((value) => ({
        account: {
            fullName: value.account?.fullName,
            email: value.account?.email,
            phone: value.account?.phone,
            gender: value.account?.gender,
            dateOfBirth: value.account?.dateOfBirth,
            address: value.account?.address,
        },
        security: {
            currentPassword: value.security?.currentPassword || "",
            newPassword: value.security?.newPassword || "",
            confirmPassword: value.security?.confirmPassword || "",
        },
    }));

export const parseLoginInput = (payload = {}) =>
    parseWithSchema(
        z.object({
            username: identifierSchema,
            password: loginPasswordSchema,
        }),
        payload
    );

export const parseRegisterInput = (payload = {}) => parseWithSchema(registerSchema, payload);

export const parseRegisterOtpVerifyInput = (payload = {}) =>
    parseWithSchema(verifyRegisterOtpSchema, {
        pendingId: payload?.pendingId ?? payload?.pending_id ?? payload?.registrationId ?? "",
        otp: payload?.otp ?? payload?.otpCode ?? payload?.code ?? "",
    });

export const parseRegisterOtpResendInput = (payload = {}) =>
    parseWithSchema(resendRegisterOtpSchema, {
        pendingId: payload?.pendingId ?? payload?.pending_id ?? payload?.registrationId ?? "",
    });

export const parseForgotPasswordInput = (payload = {}) =>
    parseWithSchema(forgotPasswordSchema, { identifier: normalizeIdentifier(payload) });

export const parseVerifyPasswordResetOtpInput = (payload = {}) =>
    parseWithSchema(verifyPasswordResetOtpSchema, {
        identifier: normalizeIdentifier(payload),
        otp: payload?.otp ?? payload?.otpCode ?? payload?.code ?? "",
    });

export const parseResetPasswordInput = (payload = {}) =>
    parseWithSchema(resetPasswordSchema, payload);

export const parseAccountSettingsInput = (payload = {}) =>
    parseWithSchema(accountSettingsSchema, payload);
