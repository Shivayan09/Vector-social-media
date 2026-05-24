import { contactSchema } from "../../src/validators/contact.validator.js";

describe("Contact Validator", () => {
  const validData = {
    name: "John Doe",
    email: "john@example.com",
    subject: "Test Subject",
    message: "This is a valid message of sufficient length.",
  };

  test("should validate correct contact data", () => {
    const result = contactSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  test("should fail if name is too short", () => {
    const result = contactSchema.safeParse({ ...validData, name: "J" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Name must be at least 2 characters");
  });

  test("should fail if email is invalid", () => {
    const result = contactSchema.safeParse({ ...validData, email: "invalid-email" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Please enter a valid email address");
  });

  test("should fail if subject is too short", () => {
    const result = contactSchema.safeParse({ ...validData, subject: "Hi" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Subject must be at least 3 characters");
  });

  test("should fail if message is too short", () => {
    const result = contactSchema.safeParse({ ...validData, message: "Short" });
    expect(result.success).toBe(false);
    expect(result.error.issues[0].message).toBe("Message must be at least 10 characters");
  });

  test("should trim whitespace", () => {
    const result = contactSchema.safeParse({
      name: "  John Doe  ",
      email: "  john@example.com  ",
      subject: "  Test Subject  ",
      message: "  This is a valid message  ",
    });
    expect(result.success).toBe(true);
    expect(result.data.name).toBe("John Doe");
    expect(result.data.email).toBe("john@example.com");
  });
});
