import { z } from "zod";

export const registerDoctorSchema = z.object({
    doctorName: z
        .string()
        .trim()
        .min(1, "Full name is required")
        .max(100, "Name must be less than 100 characters"),

    doctorGender: z.enum(["Male", "Female", "Other"], {
        required_error: "Gender is required",
    }),

    doctorDob: z
        .string()
        .refine((date) => new Date(date) < new Date(), {
            message: "Date of birth must be in the past",
        }),

    doctorDescription: z
        .string()
        .trim()
        .min(10, "Description must be at least 10 characters"),

    doctorAddress: z
        .string()
        .trim()
        .min(1, "Address is required"),

    medicalLicenseNumber: z
        .string()
        .trim()
        .min(1, "Medical License Number is required"),

    specializationId: z
        .array(z.string().min(1))
        .min(1, "Select at least one specialization"),

    qualification: z
        .array(
            z.object({
                degreeName: z.string().trim().min(1, "Degree name is required"),
                institution: z.string().trim().min(1, "Institution is required"),
                graduationDate: z.string().min(1, "Graduation date is required"),
            })
        )
        .min(1, "At least one qualification is required"),

    doctorExperience: z
        .number()
        .int()
        .min(0, "Experience cannot be negative"),

    doctorEmail: z
        .string()
        .email("Invalid email address"),

    doctorPhone: z
        .string()
        .trim()
        .regex(/^[0-9+\-() ]+$/, "Invalid phone number")
        .min(10, "Phone number must be at least 10 digits"),

    doctorPassword: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),

    confirmPassword: z
        .string()
        .min(1, "Please confirm your password"),

    workExperience: z.array(z.object({
        institute: z.string().min(1, "Institute is required"),
        post: z.string().min(1, "Post is required"),
        startDate: z.string().min(1, "Start date is required"),
        endDate: z.string().optional().or(z.literal("")),
    })).optional(),
}).refine((data) => data.doctorPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});
