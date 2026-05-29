import { sendMessageSchema } from "../../src/validators/message.validator.js";

describe("sendMessageSchema validator", () => {
  const validPayload = {
    conversationId: "507f1f77bcf86cd799439011",
    content: "Hello there!",
  };

  test("accepts a well-formed payload", () => {
    const result = sendMessageSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  test("accepts a message exactly at the 2000-character limit", () => {
    const result = sendMessageSchema.safeParse({
      ...validPayload,
      content: "a".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  test("rejects a message one character over the limit", () => {
    const result = sendMessageSchema.safeParse({
      ...validPayload,
      content: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Message must be between 1 and 2000 characters");
  });

  test("rejects a whitespace-only content string", () => {
    const result = sendMessageSchema.safeParse({
      ...validPayload,
      content: "   \t\n   ",
    });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Message content cannot be empty");
  });

  test("rejects when content is an empty string", () => {
    const result = sendMessageSchema.safeParse({
      ...validPayload,
      content: "",
    });
    expect(result.success).toBe(false);
  });

  test("rejects when content is missing entirely", () => {
    const withoutContent = { ...validPayload };
    delete withoutContent.content;
    const result = sendMessageSchema.safeParse(withoutContent);
    expect(result.success).toBe(false);
  });

  test("rejects when conversationId is missing", () => {
    const withoutId = { ...validPayload };
    delete withoutId.conversationId;
    const result = sendMessageSchema.safeParse(withoutId);
    expect(result.success).toBe(false);
  });

  test("rejects when conversationId is an empty string", () => {
    const result = sendMessageSchema.safeParse({
      ...validPayload,
      conversationId: "",
    });
    expect(result.success).toBe(false);
  });
});
