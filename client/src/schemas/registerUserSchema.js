import { z } from "zod";

export const registerUserSchema = z
    .object({
        fullname: z.string().trim().min(1, "Full name is required").max(100, "Name must be less than 100 characters"),
        email: z.string().email("Invalid email address"),
        phone: z.string().trim().regex(/^\d{10}$/, "Phone number must be exactly 10 digits"),
        dateOfBirth: z.string().min(1, "Date of birth is required")
            .refine(
                (dob) => {
                    const birthDate = new Date(dob);
                    const today = new Date();

                    let age = today.getFullYear() - birthDate.getFullYear();
                    const monthDiff = today.getMonth() - birthDate.getMonth();

                    if (
                        monthDiff < 0 ||
                        (monthDiff === 0 && today.getDate() < birthDate.getDate())
                    ) {
                        age--;
                    }

                    return age >= 18;
                },
                { message: "You must be at least 18 years old" },
            ),

        gender: z.enum(["male", "female", "other"], {message: "Please select your gender",}),
        password: z.string().min(8, "Password must be at least 8 characters").regex(/[A-Z]/, "Password must contain at least one uppercase letter")
            .regex(/[a-z]/, "Password must contain at least one lowercase letter")
            .regex(/[0-9]/, "Password must contain at least one number")
            .regex(
                /[^A-Za-z0-9]/,
                "Password must contain at least one special character",
            ),

        confirmPassword: z.string().min(1, "Please confirm your password"),
        agreeToTerms: z.boolean().refine((val) => val === true, {message: "You must agree to the terms and conditions",}),
        address: z.string().trim().min(1, "Address is required").max(200, "Address must be less than 200 characters"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });
