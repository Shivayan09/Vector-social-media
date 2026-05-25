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
const { default: Notification } = await import("../src/models/notification.model.js");

const loginUser = async (userData) => {
  await request(app).post("/api/auth/register").send(userData);
  const res = await request(app).post("/api/auth/login").send({
    username: userData.username,
    password: userData.password,
  });
  return res.headers["set-cookie"];
};

const senderData = {
  name: "Msg",
  surname: "Sender",
  phoneNumber: "8811111111",
  email: "msgsender@test.com",
  password: "Password123",
  username: "msg_sender_dd",
  bio: "Hi",
  description: "Message sender",
};

const receiverData = {
  name: "Msg",
  surname: "Receiver",
  phoneNumber: "8822222222",
  email: "msgreceiver@test.com",
  password: "Password123",
  username: "msg_receiver_dd",
  bio: "Hi",
  description: "Message receiver",
};

describe("sendMessage - notification deduplication", () => {
  let cookieSender;
  let senderUser, receiverUser;
  let conversationId;

  beforeEach(async () => {
    cookieSender = await loginUser(senderData);
    await loginUser(receiverData);

    senderUser = await User.findOne({ username: senderData.username });
    receiverUser = await User.findOne({ username: receiverData.username });

    const convoRes = await request(app)
      .post("/api/conversation")
      .set("Cookie", cookieSender)
      .send({ receiverId: receiverUser._id.toString() });

    expect(convoRes.status).toBe(200);
    conversationId = convoRes.body._id;
  });

  it("creates only one unread notification even after multiple messages", async () => {
    for (let i = 1; i <= 3; i++) {
      const res = await request(app)
        .post("/api/messages")
        .set("Cookie", cookieSender)
        .send({ conversationId, content: `Message ${i}` });
      expect(res.status).toBe(200);
    }

    const notifications = await Notification.find({
      type: "message",
      sender: senderUser._id,
      recipient: receiverUser._id,
      conversation: conversationId,
      isRead: false,
    });

    expect(notifications).toHaveLength(1);
  });

  it("creates a new notification after the previous one is marked read", async () => {
    const res1 = await request(app)
      .post("/api/messages")
      .set("Cookie", cookieSender)
      .send({ conversationId, content: "Hello" });
    expect(res1.status).toBe(200);

    await Notification.updateMany(
      {
        type: "message",
        sender: senderUser._id,
        recipient: receiverUser._id,
        conversation: conversationId,
      },
      { $set: { isRead: true } }
    );

    const res2 = await request(app)
      .post("/api/messages")
      .set("Cookie", cookieSender)
      .send({ conversationId, content: "Still there?" });
    expect(res2.status).toBe(200);

    const unreadNotifs = await Notification.find({
      type: "message",
      sender: senderUser._id,
      recipient: receiverUser._id,
      conversation: conversationId,
      isRead: false,
    });

    expect(unreadNotifs).toHaveLength(1);

    const total = await Notification.countDocuments({
      type: "message",
      sender: senderUser._id,
      recipient: receiverUser._id,
      conversation: conversationId,
    });
    expect(total).toBe(2);
  });
});
