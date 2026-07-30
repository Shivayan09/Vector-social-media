import { z } from "zod";
import validator from "validator";

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Please enter your name!" })
    .trim()
    .min(2, { message: "First name must be at least 2 characters!" })
    .max(100, { message: "First name must not exceed 100 characters!" }),
  surname: z
    .string()
    .trim()
    .max(100, { message: "Last name must not exceed 100 characters!" })
    .optional(),
  email: z
    .string({ required_error: "Please enter your email!" })
    .trim()
    .min(1, { message: "Please enter your email!" })
    .email({ message: "Please enter a valid email!" }),
  phoneNumber: z.preprocess(
    (value) =>
      typeof value === "string"
        ? value.replace(/[\s\u00A0\-.()+]/g, "")
        : value,
    z
      .string({ required_error: "Please enter your phone number!" })
      .min(1, { message: "Please enter your phone number!" })
      .refine((val) => validator.isMobilePhone(val, "any"), {
        message:
          "Please enter a valid phone number. International format (e.g. +919876543210) and local 10-digit numbers are accepted.",
      })
  ),
  password: z.string({ required_error: "Password must be at least 6 characters!" }).min(6, { message: "Password must be at least 6 characters!" }).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, {message:"Password must contain at least one uppercase letter, one lowercase letter, and one number!",}),
  username: z
    .string({ required_error: "Please enter a username!" })
    .trim()
    .min(3, { message: "Username must be at least 3 characters!" })
    .max(30, { message: "Username must not exceed 30 characters!" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Username can only contain letters, numbers, underscores, and hyphens!" }),
  bio: z
    .string({ required_error: "Please enter a bio!" })
    .trim()
    .min(1, { message: "Please enter a bio!" })
    .max(30, { message: "Bio must not exceed 30 characters!" }),
  description: z
    .string({ required_error: "Please enter a description!" })
    .trim()
    .min(1, { message: "Please enter a description!" })
    .max(200, { message: "Description must not exceed 200 characters!" }),
  isPrivate: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  username: z.string({ required_error: "Enter your username!" }).trim().min(1, { message: "Enter your username!" }),
  password: z.string({ required_error: "Enter your password!" }).min(1, { message: "Enter your password!" }),
});

export const forgotPasswordSchema = z.object({
  email: z.string({ required_error: "Please enter your email!" }).trim().email({ message: "Please enter a valid email!" }).min(1, { message: "Please enter your email!" }),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string({ required_error: "Token is required" }).min(1, { message: "Token is required" }),
  newPassword: z.string({ required_error: "New password must be at least 6 characters!",}).min(6, { message: "New password must be at least 6 characters!",}).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/, { message: "Password must contain at least one uppercase letter, one lowercase letter, and one number!"}),
});

