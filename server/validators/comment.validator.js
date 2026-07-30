import { z } from "zod";

/**
 * Validator schema for comment submissions.
 * - post: Must be a valid 24-character hexadecimal ObjectId string.
 * - content: Trimmed string, min 1 character, max 500 characters.
 */
export const commentSchema = z.object({
  post: z
    .string()
    .min(1, { message: "Post ID is required" })
    .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Post ID format" }),
  content: z
    .string()
    .trim()
    .min(1, { message: "Comment cannot be empty" })
    .max(500, { message: "Comment cannot exceed 500 characters" }),
  parentCommentId: z
    .string()
    .regex(/^[0-9a-fA-F]{24}$/, { message: "Invalid Parent Comment ID format" })
    .optional(),
});
