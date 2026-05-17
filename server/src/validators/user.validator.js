import { z } from "zod";
import validator from "validator";

export const registerSchema = z.object({
  name: z.string().trim().min(1, { message: "Please enter your name!" }),
  surname: z.string().trim().optional(),
  email: z
    .string()
    .trim()
    .min(1, { message: "Please enter your email!" })
    .email({ message: "Please enter a valid email!" }),
  phoneNumber: z
    .string()
    .trim()
    .min(1, { message: "Please enter your phone number!" })
    .refine((val) => validator.isMobilePhone(val, "any"), {
      message: "Please enter a valid phone number!",
    }),
  password: z.string().min(6, { message: "Password must be at least 6 characters!" }),
  username: z.string().trim().min(1, { message: "Please enter a username!" }),
  bio: z.string().trim().min(1, { message: "Please enter a bio!" }),
  description: z.string().trim().min(1, { message: "Please enter a description!" }),
  isPrivate: z.boolean().optional().default(false),
});

export const loginSchema = z.object({
  username: z.string().trim().min(1, { message: "Enter your username!" }),
  password: z.string().min(1, { message: "Enter your password!" }),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email!" }).min(1, { message: "Please enter your email!" }),
});

export const resetPasswordSchema = z.object({
  resetToken: z.string().min(1, { message: "Token is required!" }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters!" }),
});
