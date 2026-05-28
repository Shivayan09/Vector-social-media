import { commentSchema } from "../../src/validators/comment.validator.js";

describe("Comment Validator", () => {
  const validPostId = "507f1f72bcf86cd799439011"; // Valid 24-char hex ObjectId

  const validData = {
    post: validPostId,
    content: "This is a valid comment.",
  };

  test("should validate correct comment data", () => {
    const result = commentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test("should fail if post ID is missing", () => {
    const result = commentSchema.safeParse({ content: "Valid content" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain("expected string");
  });

  test("should fail if post ID is empty string", () => {
    const result = commentSchema.safeParse({ ...validData, post: "" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Post ID is required");
  });

  test("should fail if post ID is not a valid 24-char hex string", () => {
    const result = commentSchema.safeParse({
      ...validData,
      post: "12345678901234567890123z", // Wrong length or invalid chars
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Invalid Post ID format");
  });

  test("should fail if content is missing", () => {
    const result = commentSchema.safeParse({ post: validPostId });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toContain("expected string");
  });

  test("should fail if content is empty string (after trim)", () => {
    const result = commentSchema.safeParse({
      ...validData,
      content: "   ",
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Comment cannot be empty");
  });

  test("should fail if content exceeds 500 characters", () => {
    const longContent = "a".repeat(501);
    const result = commentSchema.safeParse({
      ...validData,
      content: longContent,
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Comment cannot exceed 500 characters");
  });

  test("should trim content whitespace", () => {
    const result = commentSchema.safeParse({
      ...validData,
      content: "   Valid content with spaces   ",
    });
    expect(result.success).toBe(true);
    expect(result.data.content).toBe("Valid content with spaces");
  });

  test("should accept content with exactly 1 character", () => {
    const result = commentSchema.safeParse({
      ...validData,
      content: "a",
    });
    expect(result.success).toBe(true);
  });

  test("should accept content with exactly 500 characters", () => {
    const edgeContent = "a".repeat(500);
    const result = commentSchema.safeParse({
      ...validData,
      content: edgeContent,
    });
    expect(result.success).toBe(true);
  });
});
