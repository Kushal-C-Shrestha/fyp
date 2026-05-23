import * as z from "zod";

export const contactSchema = z.object({
    firstName: z
        .string()
        .nonempty("First name is required")
        .refine(val => val.trim() !== "", "First name cannot be empty"),

    lastName: z
        .string()
        .nonempty("Last name is required")
        .refine(val => val.trim() !== "", "Last name cannot be empty"),

    phone: z
        .string()
        .nonempty("Phone number is required")
        .regex(/^\d+$/, "Phone number must contain only digits")
        .length(10, "Phone number must be exactly 10 digits"),

    email: z
        .string()
        .nonempty("Email is required")
        .email("Invalid email address"),

    message: z
        .string()
        .nonempty("Message is required")
        .min(10, "Message must be at least 10 characters"),
});