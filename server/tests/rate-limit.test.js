import request from "supertest";
import app from "../src/app.js";

const previousNodeEnv = process.env.NODE_ENV;

const rateLimitedUser = {
  name: "Rate",
  surname: "Limit",
  phoneNumber: "5555555555",
  email: "ratelimit@test.com",
  password: "Password123",
  username: "ratelimituser",
  bio: "Bio",
  description: "Rate limit test user",
};

const registerAndLogin = async (ip) => {
  await request(app)
    .post("/api/auth/register")
    .set("X-Forwarded-For", ip)
    .send(rateLimitedUser);

  const loginResponse = await request(app)
    .post("/api/auth/login")
    .set("X-Forwarded-For", ip)
    .send({
      username: rateLimitedUser.username,
      password: rateLimitedUser.password,
    });

  return loginResponse.headers["set-cookie"];
};

describe("Rate limiting", () => {
  beforeAll(() => {
    process.env.NODE_ENV = "development";
  });

  afterAll(() => {
    process.env.NODE_ENV = previousNodeEnv;
  });

  it("limits repeated API requests by IP", async () => {
    const ip = "203.0.113.10";
    let response;

    for (let i = 0; i < 100; i += 1) {
      response = await request(app)
        .get("/api/posts")
        .set("X-Forwarded-For", ip);
    }

    expect(response.status).toBe(200);

    response = await request(app)
      .get("/api/posts")
      .set("X-Forwarded-For", ip);

    expect(response.status).toBe(429);
    expect(response.body.message).toBe("Too many API requests from this IP. Please try again later.");
  });

  it("applies a stricter limiter to search requests", async () => {
    const ip = "203.0.113.30";
    let response;

    for (let i = 0; i < 50; i += 1) {
      response = await request(app)
        .get("/api/posts/search")
        .set("X-Forwarded-For", ip);
    }

    expect(response.status).toBe(200);

    response = await request(app)
      .get("/api/posts/search")
      .set("X-Forwarded-For", ip);

    expect(response.status).toBe(429);
    expect(response.body.message).toBe("Too many search requests from this IP. Please try again later.");
  });

  it("applies a stricter limiter to post creation", async () => {
    const ip = "203.0.113.20";
    const cookie = await registerAndLogin(ip);
    let response;

    for (let i = 0; i < 10; i += 1) {
      response = await request(app)
        .post("/api/posts")
        .set("Cookie", cookie)
        .set("X-Forwarded-For", ip)
        .send({ intent: "ask" });
    }

    expect(response.status).toBe(400);

    response = await request(app)
      .post("/api/posts")
      .set("Cookie", cookie)
      .set("X-Forwarded-For", ip)
      .send({ intent: "ask" });

    expect(response.status).toBe(429);
    expect(response.body.message).toBe("Too many post changes from this IP. Please try again later.");
  });
});
