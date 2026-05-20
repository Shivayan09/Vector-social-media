import request from "supertest";
import app from "../src/app.js";

describe("Invalid Post ID handling", () => {
  let cookie;

  const testUser = {
    name: "Invalid",
    surname: "Tester",
    phoneNumber: "0987654322",
    email: "invalid@test.com",
    password: "password123",
    username: "invalidtester",
    bio: "Bio",
    description: "Desc",
  };

  beforeEach(async () => {
    // Register and login to get auth cookie
    await request(app).post("/api/auth/register").send(testUser);
    const loginRes = await request(app).post("/api/auth/login").send({
      username: testUser.username,
      password: testUser.password,
    });
    cookie = loginRes.headers["set-cookie"];
  });

  it("DELETE /api/posts/:id with malformed id should return 400", async () => {
    const res = await request(app)
      .delete("/api/posts/invalid-id")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid post ID format/i);
  });

  it("GET /api/posts/:postId with malformed id should return 400", async () => {
    const res = await request(app)
      .get("/api/posts/invalid-id")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid post ID format/i);
  });

  it("PUT /api/posts/:id with malformed id should return 400", async () => {
    const res = await request(app)
      .put("/api/posts/invalid-id")
      .set("Cookie", cookie)
      .send({ intent: "share", content: "Updated content" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid post ID format/i);
  });

  it("GET /api/posts/user/:userId with malformed id should return 400", async () => {
    const res = await request(app)
      .get("/api/posts/user/invalid-id")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid user ID format/i);
  });

  it("POST /api/posts/like/:id with malformed id should return 400", async () => {
    const res = await request(app)
      .post("/api/posts/like/invalid-id")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid post ID format/i);
  });

  it("PUT /api/posts/:id/like with malformed id should return 400", async () => {
    const res = await request(app)
      .put("/api/posts/invalid-id/like")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid post ID format/i);
  });

  it("PUT /api/posts/:id/share with malformed id should return 400", async () => {
    const res = await request(app)
      .put("/api/posts/invalid-id/share")
      .set("Cookie", cookie);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid post ID format/i);
  });
});
