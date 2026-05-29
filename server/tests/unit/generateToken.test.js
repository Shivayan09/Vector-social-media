import { generateToken, getCookieOptions } from "../../src/utils/generateToken.js";

describe("generateToken Utility", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("generateToken should return a string", () => {
    process.env.JWT_SECRET = "testsecret";
    const token = generateToken("user123", 5);
    expect(typeof token).toBe("string");
  });

  test("getCookieOptions should return development options when NODE_ENV is development", () => {
    process.env.NODE_ENV = "development";
    const options = getCookieOptions();

    expect(options).toEqual({
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });

  test("getCookieOptions should return production options when NODE_ENV is production", () => {
    process.env.NODE_ENV = "production";
    const options = getCookieOptions();

    expect(options).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  });
});
