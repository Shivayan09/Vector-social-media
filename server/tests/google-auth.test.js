import { jest } from "@jest/globals";
import request from "supertest";
import User from "../src/models/user.model.js";

const payloadByToken = new Map();

jest.unstable_mockModule("google-auth-library", () => ({
  OAuth2Client: class OAuth2ClientMock {
    async verifyIdToken({ idToken }) {
      const payload = payloadByToken.get(idToken);
      if (!payload) {
        throw new Error("Unknown token in test");
      }
      return {
        getPayload() {
          return payload;
        },
      };
    }
  },
}));

const { default: app } = await import("../src/app.js");

describe("Google Auth Endpoint", () => {
  beforeEach(() => {
    payloadByToken.clear();
  });

  it("links an existing local account by email instead of failing", async () => {
    await User.create({
      name: "Alice",
      surname: "Local",
      email: "alice@test.com",
      username: "alice",
      password: "password123",
      bio: "",
      description: "",
    });

    payloadByToken.set("token_alice", {
      sub: "google_sub_alice",
      email: "alice@test.com",
      given_name: "Alice",
      family_name: "G",
      picture: "https://example.com/a.png",
      name: "Alice G",
    });

    const res = await request(app)
      .post("/api/auth/google")
      .send({ credential: "token_alice" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const updated = await User.findOne({ email: "alice@test.com" });
    expect(updated).toBeTruthy();
    expect(updated.googleId).toBe("google_sub_alice");
    expect(updated.provider).toBe("google");
  });

  it("handles concurrent username collisions by retrying until unique", async () => {
    await User.create({
      name: "Occupier",
      surname: "Seed",
      email: "seed@test.com",
      username: "john",
      password: "password123",
      bio: "",
      description: "",
    });

    payloadByToken.set("token_1", {
      sub: "google_sub_1",
      email: "john1@test.com",
      given_name: "John",
      family_name: "One",
      picture: "https://example.com/j1.png",
      name: "John One",
    });

    payloadByToken.set("token_2", {
      sub: "google_sub_2",
      email: "john2@test.com",
      given_name: "John",
      family_name: "Two",
      picture: "https://example.com/j2.png",
      name: "John Two",
    });

    const [res1, res2] = await Promise.all([
      request(app).post("/api/auth/google").send({ credential: "token_1" }),
      request(app).post("/api/auth/google").send({ credential: "token_2" }),
    ]);

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res2.body.success).toBe(true);

    const users = await User.find({ email: /john[12]@test\.com/ }).select(
      "username email"
    );
    expect(users).toHaveLength(2);
    expect(users[0].username).toBeTruthy();
    expect(users[1].username).toBeTruthy();
    expect(users[0].username).not.toBe(users[1].username);
    expect(users[0].username).not.toBe("john");
    expect(users[1].username).not.toBe("john");
  });
});
