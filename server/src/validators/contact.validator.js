import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string({ required_error: "Please enter your name" })
    .trim()
    .min(2, { message: "Name must be at least 2 characters" })
    .max(100, { message: "Name cannot exceed 100 characters" }),
  email: z
    .string({ required_error: "Please enter your email" })
    .trim()
    .lowercase()
    .email({ message: "Please enter a valid email address" })
    .min(5, { message: "Email is too short" })
    .max(254, { message: "Email is too long" }),
  subject: z
    .string({ required_error: "Please enter a subject" })
    .trim()
    .min(3, { message: "Subject must be at least 3 characters" })
    .max(200, { message: "Subject cannot exceed 200 characters" }),
  message: z
    .string({ required_error: "Please enter your message" })
    .trim()
    .min(10, { message: "Message must be at least 10 characters" })
    .max(5000, { message: "Message cannot exceed 5000 characters" }),
});
