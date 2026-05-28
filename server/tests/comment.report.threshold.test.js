import { jest } from "@jest/globals";

jest.unstable_mockModule("../src/socket/socket.js", () => ({
  getIO: () => ({
    to: () => ({ emit: () => {} }),
    emit: () => {},
  }),
}));

const { default: request } = await import("supertest");
const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/user.model.js");
const { default: Post } = await import("../src/models/post.model.js");
const { default: Comment } = await import("../src/models/comment.model.js");
const { default: Report } = await import("../src/models/report.model.js");
const { default: Notification } = await import("../src/models/notification.model.js");

const REPORT_THRESHOLD = 5;

const makeUser = (n) => ({
  name: `Reporter`,
  surname: `${n}`,
  phoneNumber: `880000000${n}`,
  email: `reporter${n}_crt@test.com`,
  password: "Password123",
  username: `reporter${n}_crt`,
  bio: "Hi",
  description: `Reporter ${n}`,
});

const authorData = {
  name: "Comment",
  surname: "Author",
  phoneNumber: "8811111111",
  email: "crt_author@test.com",
  password: "Password123",
  username: "crt_comment_author",
  bio: "Hi",
  description: "Comment author",
};

const loginUser = async (userData) => {
  await request(app).post("/api/auth/register").send(userData);
  const res = await request(app).post("/api/auth/login").send({
    username: userData.username,
    password: userData.password,
  });
  return res.headers["set-cookie"];
};

describe("createCommentReport - auto-removal threshold", () => {
  let authorUser;
  let reporterCookies;
  let post;
  let comment;

  beforeEach(async () => {
    await loginUser(authorData);
    authorUser = await User.findOne({ username: authorData.username });

    reporterCookies = [];
    for (let i = 1; i <= REPORT_THRESHOLD; i++) {
      reporterCookies.push(await loginUser(makeUser(i)));
    }

    post = await Post.create({
      author: authorUser._id,
      content: "Test post for comment report threshold",
      intent: "share",
      commentsCount: 1,
    });

    comment = await Comment.create({
      post: post._id,
      author: authorUser._id,
      content: "A comment that will be reported",
    });
  });

  it("removes the comment and cleans up reports when threshold is reached", async () => {
    // Submit reports from the first (threshold - 1) reporters; comment should survive
    for (let i = 0; i < REPORT_THRESHOLD - 1; i++) {
      const res = await request(app)
        .post("/api/reports/comments")
        .set("Cookie", reporterCookies[i])
        .send({ commentId: comment._id.toString(), reason: "spam" });

      expect(res.status).toBe(201);
      expect(res.body.removed).toBe(false);
    }

    // The comment still exists
    const stillExists = await Comment.findById(comment._id);
    expect(stillExists).not.toBeNull();

    // Submit the threshold-crossing report
    const finalRes = await request(app)
      .post("/api/reports/comments")
      .set("Cookie", reporterCookies[REPORT_THRESHOLD - 1])
      .send({ commentId: comment._id.toString(), reason: "spam" });

    expect(finalRes.status).toBe(200);
    expect(finalRes.body.removed).toBe(true);

    // Comment should be deleted
    const deletedComment = await Comment.findById(comment._id);
    expect(deletedComment).toBeNull();

    // Reports should be cleaned up
    const remainingReports = await Report.countDocuments({
      targetType: "comment",
      targetId: comment._id,
    });
    expect(remainingReports).toBe(0);

    // commentsCount on the parent post should be decremented
    const updatedPost = await Post.findById(post._id);
    expect(updatedPost.commentsCount).toBe(0);
  });

  it("creates a comment_removed_reported notification for the comment author", async () => {
    for (let i = 0; i < REPORT_THRESHOLD; i++) {
      await request(app)
        .post("/api/reports/comments")
        .set("Cookie", reporterCookies[i])
        .send({ commentId: comment._id.toString(), reason: "harassment" });
    }

    const notification = await Notification.findOne({
      recipient: authorUser._id,
      type: "comment_removed_reported",
    });

    expect(notification).not.toBeNull();
    expect(notification.comment.toString()).toBe(comment._id.toString());
  });
});
