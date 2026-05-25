import request from "supertest";

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/user.model.js");
const { default: Post } = await import("../src/models/post.model.js");
const { default: Comment } = await import("../src/models/comment.model.js");

describe("Report Endpoints", () => {
  let userACookie;
  let userBCookie;
  let userA;

  const testUserA = {
    name: "User",
    surname: "A",
    phoneNumber: "1111111111",
    email: "usera@test.com",
    password: "Password123",
    username: "usera",
    bio: "Bio A",
    description: "Desc A",
  };

  const testUserB = {
    name: "User",
    surname: "B",
    phoneNumber: "2222222222",
    email: "userb@test.com",
    password: "Password123",
    username: "userb",
    bio: "Bio B",
    description: "Desc B",
  };

  beforeEach(async () => {
    // Register and login User A
    await request(app).post("/api/auth/register").send(testUserA);
    const loginResA = await request(app).post("/api/auth/login").send({
      username: testUserA.username,
      password: testUserA.password,
    });
    userACookie = loginResA.headers["set-cookie"];
    userA = await User.findOne({ username: testUserA.username });

    // Register and login User B
    await request(app).post("/api/auth/register").send(testUserB);
    const loginResB = await request(app).post("/api/auth/login").send({
      username: testUserB.username,
      password: testUserB.password,
    });
    userBCookie = loginResB.headers["set-cookie"];
  });

  describe("POST /api/reports/posts", () => {
    it("should prevent a user from reporting their own post", async () => {
      // User A creates a post
      const post = await Post.create({
        content: "User A's post content",
        author: userA._id,
        intent: "share",
      });

      // User A attempts to report their own post
      const res = await request(app)
        .post("/api/reports/posts")
        .set("Cookie", userACookie)
        .send({
          postId: post._id.toString(),
          reason: "spam",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("You cannot report your own post");
    });

    it("should allow a user to report another user's post", async () => {
      // User A creates a post
      const post = await Post.create({
        content: "User A's post content",
        author: userA._id,
        intent: "share",
      });

      // User B reports User A's post
      const res = await request(app)
        .post("/api/reports/posts")
        .set("Cookie", userBCookie)
        .send({
          postId: post._id.toString(),
          reason: "spam",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Report submitted");
    });
  });

  describe("POST /api/reports/comments", () => {
    it("should prevent a user from reporting their own comment", async () => {
      // User A creates a post
      const post = await Post.create({
        content: "User A's post content",
        author: userA._id,
        intent: "share",
      });

      // User A creates a comment
      const comment = await Comment.create({
        post: post._id,
        author: userA._id,
        content: "User A's comment content",
      });

      // User A attempts to report their own comment
      const res = await request(app)
        .post("/api/reports/comments")
        .set("Cookie", userACookie)
        .send({
          commentId: comment._id.toString(),
          reason: "harassment",
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe("You cannot report your own comment");
    });

    it("should allow a user to report another user's comment", async () => {
      // User A creates a post
      const post = await Post.create({
        content: "User A's post content",
        author: userA._id,
        intent: "share",
      });

      // User A creates a comment
      const comment = await Comment.create({
        post: post._id,
        author: userA._id,
        content: "User A's comment content",
      });

      // User B reports User A's comment
      const res = await request(app)
        .post("/api/reports/comments")
        .set("Cookie", userBCookie)
        .send({
          commentId: comment._id.toString(),
          reason: "harassment",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe("Report submitted");
    });
  });
});
