import { z } from "zod";

export const sendMessageSchema = z.object({
  conversationId: z
    .string()
    .min(1, { message: "conversationId is required" }),
  content: z
    .string()
    .max(2000, { message: "Message must be between 1 and 2000 characters" })
    .optional(),
});
