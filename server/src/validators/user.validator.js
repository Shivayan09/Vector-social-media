import { z } from "zod";
import validator from "validator";

export const registerSchema = z.object({
  name: z.string({ required_error: "Please enter your name!" }).trim().min(1, { message: "Please enter your name!" }),
  surname: z.string().trim().optional(),
  email: z
    .string({ required_error: "Please enter your email!" })
    .trim()
    .min(1, { message: "Please enter your email!" })
    .email({ message: "Please enter a valid email!" }),
  phoneNumber: z.preprocess(
    (value) => (typeof value === "string" ? value.replace(/\s+/g, "") : value),
    z
      .string({ required_error: "Please enter your phone number!" })
      .min(1, { message: "Please enter your phone number!" })
      .refine((val) => validator.isMobilePhone(val, "any"), {
        message: "Please enter a valid phone number!",
      })
  ),
  password: z.string({ required_error: "Password must be at least 6 characters!" }).min(6, { message: "Password must be at least 6 characters!" }),
  username: z.string({ required_error: "Please enter a username!" }).trim().min(1, { message: "Please enter a username!" }),
  bio: z.string({ required_error: "Please enter a bio!" }).trim().min(1, { message: "Please enter a bio!" }),
  description: z.string({ required_error: "Please enter a description!" }).trim().min(1, { message: "Please enter a description!" }),
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
  resetToken: z.string({ required_error: "Token is required!" }).min(1, { message: "Token is required!" }),
  newPassword: z.string({ required_error: "New password must be at least 6 characters!" }).min(6, { message: "New password must be at least 6 characters!" }),
});

