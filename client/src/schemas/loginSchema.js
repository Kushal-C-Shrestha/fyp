import { z } from "zod";

export const loginSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, "Email or phone is required")
    .refine((value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[0-9+\-() ]{10,}$/;
      return emailRegex.test(value) || phoneRegex.test(value);
    }, "Enter a valid email or phone number"),
  password: z.string().min(1, "Password is required"),
});
