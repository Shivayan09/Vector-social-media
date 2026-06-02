import { jest } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: "mock_id" }),
    }),
  },
}));

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/user.model.js");

const validUser = {
  name: "Test",
  surname: "User",
  email: "lifecycle@example.com",
  password: "Password123",
  username: "lifecycleuser",
  bio: "bio",
  description: "desc",
  phoneNumber: "1234567890",
};

async function registerAndLogin() {
  await request(app).post("/api/auth/register").send(validUser);
  const res = await request(app).post("/api/auth/login").send({
    username: validUser.username,
    password: validUser.password,
  });
  const cookie = res.headers["set-cookie"];
  return cookie;
}

describe("Account Lifecycle", () => {
  describe("POST /api/users/deactivate", () => {
    it("should deactivate account and set deletionScheduledAt 30 days out", async () => {
      const cookie = await registerAndLogin();

      const res = await request(app)
        .post("/api/users/deactivate")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const user = await User.findOne({ username: validUser.username });
      expect(user.isDeactivated).toBe(true);
      expect(user.deletionScheduledAt).toBeDefined();

      const diff = user.deletionScheduledAt - new Date();
      expect(diff).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
    });

    it("should block protected endpoints after deactivation", async () => {
      const cookie = await registerAndLogin();

      await request(app)
        .post("/api/users/deactivate")
        .set("Cookie", cookie);

      const res = await request(app)
        .get("/api/users/suggestions")
        .set("Cookie", cookie);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Account is deactivated.");
    });
  });

  describe("POST /api/auth/login (reactivation)", () => {
    it("should reactivate account when logging in within grace period", async () => {
      const cookie = await registerAndLogin();

      await request(app)
        .post("/api/users/deactivate")
        .set("Cookie", cookie);

      const res = await request(app).post("/api/auth/login").send({
        username: validUser.username,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.reactivated).toBe(true);

      const user = await User.findOne({ username: validUser.username });
      expect(user.isDeactivated).toBe(false);
      expect(user.deletionScheduledAt).toBeNull();
    });

    it("should block login if grace period has expired", async () => {
      const cookie = await registerAndLogin();

      await request(app)
        .post("/api/users/deactivate")
        .set("Cookie", cookie);

      // Simulate expired grace period
      await User.findOneAndUpdate(
        { username: validUser.username },
        { deletionScheduledAt: new Date("2000-01-01") }
      );

      const res = await request(app).post("/api/auth/login").send({
        username: validUser.username,
        password: validUser.password,
      });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });
  });

  describe("Scheduled hard delete", () => {
    it("should permanently delete user and clean up related data after grace period", async () => {
      const cookie = await registerAndLogin();

      await request(app)
        .post("/api/users/deactivate")
        .set("Cookie", cookie);

      // Simulate expired grace period
      await User.findOneAndUpdate(
        { username: validUser.username },
        { deletionScheduledAt: new Date("2000-01-01") }
      );

      const { hardDeleteExpiredUsers } = await import(
        "../src/jobs/deleteExpiredAccounts.js"
      );
      await hardDeleteExpiredUsers();

      const user = await User.findOne({ username: validUser.username });
      expect(user).toBeNull();
    });
  });
});