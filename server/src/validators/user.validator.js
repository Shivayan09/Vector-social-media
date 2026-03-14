import { z } from "zod";

export const registerSchema = z.object({
    name: z
        .string()
        .min(1, { message: "Name is required" })
        .max(50, { message: "Name cannot exceed 50 characters" }),
    surname: z
        .string()
        .min(1, {message: "Surname is required"})
        .max(50, {message: "Surname cannot exceed 50 characters"}),
    email: z
        .string()
        .min(1, {message: "Email is required"})
        .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {message: "Invalid email address"}),
    password: z
        .string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/[A-Z]/, { message: "Password must include one uppercase letter" })
        .regex(/[a-z]/, { message: "Password must include one lowercase letter" })
        .regex(/[0-9]/, { message: "Password must include one number" })
        .regex(/[^A-Za-z0-9]/, {message: "Password must include one special character"}),
    phoneNumber: z
        .string()
        .min(10, { message: "Phone number must be at least 10 digits" }),
});

export const loginSchema = z.object({
    email: z
        .string()
        .min(1, {message: "Email is required"})
        .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, {message: "Invalid email address"}),
});