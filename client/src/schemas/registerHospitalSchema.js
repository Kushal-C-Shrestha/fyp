import { z } from "zod";

export const registerHospitalSchema = z.object({
    // Step 1: Basic Information
    hospitalName: z
        .string()
        .trim()
        .min(1, "Hospital name is required"),

    hospitalLocation: z
        .string()
        .trim()
        .min(1, "Hospital location is required"),

    hospitalMapURL: z
        .string()
        .url("Invalid Google Maps URL")
        .nullable()
        .optional()
        .or(z.literal("")),

    hospitalType: z.enum(
        ["General", "Specialty", "Teaching", "Clinic"],
        {
            required_error: "Hospital type is required",
        }
    ),

    hospitalDescription: z
        .string()
        .trim()
        .min(20, "Description must be at least 20 characters"),

    // Step 2: Legal Details
    registrationNumber: z
        .string()
        .trim()
        .min(1, "Registration number is required"),

    yearEstablished: z
        .number()
        .int()
        .min(1800, "Year established is invalid")
        .max(new Date().getFullYear(), "Invalid established year."),

    licenseAuthority: z
        .string()
        .trim()
        .min(1, "License authority is required"),

    // Step 3: Contact Information
    primaryEmail: z
        .string()
        .email("Invalid primary email address"),

    primaryPhone: z
        .string()
        .trim()
        .regex(/^[0-9+\-() ]+$/, "Invalid primary phone number"),

    receptionNumber: z
        .string()
        .trim()
        .regex(/^[0-9+\-() ]+$/, "Invalid phone number"),

    alternateEmail: z
        .string()
        .email("Invalid alternate email")
        .nullable()
        .optional()
        .or(z.literal("")),

    alternatePhone: z
        .string()
        .trim()
        .regex(/^[0-9+\-() ]+$/, "Invalid alternate phone number")
        .nullable()
        .optional()
        .or(z.literal("")),

    websiteURL: z
        .string()
        .url("Invalid website URL")
        .nullable()
        .optional()
        .or(z.literal("")),

    // Step 4: Admin Account
    adminName: z
        .string()
        .trim()
        .min(1, "Admin name is required")
        .max(100, "Name must be less than 100 characters"),

    adminEmail: z
        .string()
        .email("Invalid admin email address"),

    adminPhone: z
        .string()
        .trim()
        .regex(/^[0-9+\-() ]+$/, "Invalid phone number")
        .min(10, "Phone number must be at least 10 digits"),

    adminDob: z.string().min(1, "Date of birth is required"),
    adminGender: z.enum(["male", "female", "other"], {
        errorMap: () => ({ message: "Gender is required" }),
    }),

    adminPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),

    adminConfirmPassword: z
        .string()
        .min(1, "Please confirm your password"),

    // Step 5: Medical Services
    medicalDepartments: z
        .array(z.string())
        .min(1, "Select at least one department"),

    hospitalServices: z
        .array(z.string())
        .min(1, "Select at least one service"),

    // Step 6: Availability
    emergencyServices: z.boolean(),

    openingTime: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
        .optional()
        .or(z.literal("")),

    closingTime: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)")
        .optional()
        .or(z.literal("")),

    daysOpen: z
        .array(z.string())
        .min(1, "Select days of operation"),

    // Step 7: Documents (handled separately as file uploads)
}).refine((data) => data.adminPassword === data.adminConfirmPassword, {
    message: "Passwords do not match",
    path: ["adminConfirmPassword"],
}).refine((data) => {
    // Check alternate email is not same as primary
    if (data.alternateEmail && data.alternateEmail !== "") {
        return data.alternateEmail !== data.primaryEmail;
    }
    return true;
}, {
    message: "Alternate email cannot be the same as primary email",
    path: ["alternateEmail"],
}).refine((data) => {
    // Check alternate phone is not same as primary
    if (data.alternatePhone && data.alternatePhone !== "") {
        return data.alternatePhone !== data.primaryPhone;
    }
    return true;
}, {
    message: "Alternate phone cannot be the same as primary phone",
    path: ["alternatePhone"],
});
