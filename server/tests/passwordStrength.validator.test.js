import { registerSchema } from "../src/validators/user.validator.js";

describe("Password Strength Validation", () => {
  const baseUserData = {
    name: "John",
    surname: "Doe",
    email: "john@example.com",
    phoneNumber: "+919876543210",
    username: "johndoe",
    bio: "Developer",
    description: "I love coding",
  };

  test("accepts valid strong password", () => {
    const result = registerSchema.safeParse({
      ...baseUserData,
      password: "SafePassword123",
    });

    expect(result.success).toBe(true);
  });

  test("rejects short password", () => {
    const result = registerSchema.safeParse({
      ...baseUserData,
      password: "P1a",
    });

    expect(result.success).toBe(false);
  });

  test("rejects password without uppercase", () => {
    const result = registerSchema.safeParse({
      ...baseUserData,
      password: "safepassword123",
    });

    expect(result.success).toBe(false);
  });

  test("rejects password without lowercase", () => {
    const result = registerSchema.safeParse({
      ...baseUserData,
      password: "SAFEPASSWORD123",
    });

    expect(result.success).toBe(false);
  });

  test("rejects password without number", () => {
    const result = registerSchema.safeParse({
      ...baseUserData,
      password: "SafePassword",
    });

    expect(result.success).toBe(false);
  });
});