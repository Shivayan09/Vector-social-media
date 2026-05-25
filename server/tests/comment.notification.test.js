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
const { default: Notification } = await import("../src/models/notification.model.js");

const loginUser = async (userData) => {
  await request(app).post("/api/auth/register").send(userData);
  const res = await request(app).post("/api/auth/login").send({
    username: userData.username,
    password: userData.password,
  });
  return res.headers["set-cookie"];
};

const authorData = {
  name: "Post",
  surname: "Author",
  phoneNumber: "7711111111",
  email: "postauthor@test.com",
  password: "Password123",
  username: "post_author_cn",
  bio: "Hi",
  description: "Post author",
};

const commenterData = {
  name: "Comment",
  surname: "User",
  phoneNumber: "7722222222",
  email: "commenter@test.com",
  password: "Password123",
  username: "commenter_cn",
  bio: "Hi",
  description: "Commenter",
};

describe("deleteComment - notification precision", () => {
  let cookieCommenter;
  let authorUser, commenterUser;
  let postId;

  beforeEach(async () => {
    await loginUser(authorData);
    cookieCommenter = await loginUser(commenterData);

    authorUser = await User.findOne({ username: authorData.username });
    commenterUser = await User.findOne({ username: commenterData.username });

    const post = await Post.create({
      author: authorUser._id,
      content: "Test post for comment notifications",
      intent: "share",
    });
    postId = post._id.toString();
  });

  it("stores comment._id on the notification so deleteComment removes the right one", async () => {
    const res1 = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Cookie", cookieCommenter)
      .send({ content: "First comment" });

    const res2 = await request(app)
      .post(`/api/comments/${postId}`)
      .set("Cookie", cookieCommenter)
      .send({ content: "Second comment" });

    expect(res1.status).toBe(201);
    expect(res2.status).toBe(201);

    const comment1Id = res1.body._id;
    const comment2Id = res2.body._id;

    const notifsBefore = await Notification.find({
      type: "comment",
      sender: commenterUser._id,
      recipient: authorUser._id,
    });
    expect(notifsBefore).toHaveLength(2);

    const notif1 = notifsBefore.find(
      (n) => n.comment?.toString() === comment1Id
    );
    const notif2 = notifsBefore.find(
      (n) => n.comment?.toString() === comment2Id
    );
    expect(notif1).toBeDefined();
    expect(notif2).toBeDefined();

    const delRes = await request(app)
      .delete(`/api/comments/${comment1Id}`)
      .set("Cookie", cookieCommenter);

    expect(delRes.status).toBe(200);

    const notifsAfter = await Notification.find({
      type: "comment",
      sender: commenterUser._id,
      recipient: authorUser._id,
    });

    expect(notifsAfter).toHaveLength(1);
    expect(notifsAfter[0].comment?.toString()).toBe(comment2Id);
  });
});
