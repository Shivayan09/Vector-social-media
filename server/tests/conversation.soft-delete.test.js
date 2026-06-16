import { jest } from "@jest/globals";

export const mockEmit = jest.fn();
export const mockTo = jest.fn().mockReturnValue({ emit: mockEmit });

jest.unstable_mockModule("../src/socket/socket.js", () => ({
  getIO: () => ({
    to: mockTo,
    emit: jest.fn(),
  }),
}));

const { default: request } = await import("supertest");
const { default: app } = await import("../src/app.js");
const { default: Conversation } = await import("../src/models/conversation.model.js");
const { default: Message } = await import("../src/models/message.model.js");
const { default: User } = await import("../src/models/user.model.js");

const loginUser = async (userData) => {
  await request(app).post("/api/auth/register").send(userData);
  const res = await request(app).post("/api/auth/login").send({
    username: userData.username,
    password: userData.password,
  });
  return res.headers["set-cookie"];
};

const userAData = {
  name: "Conv",
  surname: "Alpha",
  phoneNumber: "6611111111",
  email: "conva@test.com",
  password: "Password123",
  username: "conv_alpha",
  bio: "Hi",
  description: "Test user A",
};

const userBData = {
  name: "Conv",
  surname: "Beta",
  phoneNumber: "6622222222",
  email: "convb@test.com",
  password: "Password123",
  username: "conv_beta",
  bio: "Hi",
  description: "Test user B",
};

describe("DELETE /api/conversations/:id - Soft Delete", () => {
  let cookieA, cookieB;
  let userA, userB;
  let conversationId;

  beforeEach(async () => {
    cookieA = await loginUser(userAData);
    cookieB = await loginUser(userBData);

    userA = await User.findOne({ username: userAData.username });
    userB = await User.findOne({ username: userBData.username });

    const convo = await Conversation.create({
      participants: [userA._id, userB._id],
    });
    conversationId = convo._id.toString();

    await Message.create({
      conversation: convo._id,
      sender: userA._id,
      content: "Hello",
    });
  });

  it("does not leak soft-deleted message content through the conversation lastMessage preview", async () => {
    const deleted = await Message.create({
      conversation: conversationId,
      sender: userA._id,
      content: "This should not appear",
    });

    const delRes = await request(app)
      .delete(`/api/messages/${deleted._id}`)
      .set("Cookie", cookieA);

    expect(delRes.status).toBe(200);

    const listRes = await request(app)
      .get("/api/conversation")
      .set("Cookie", cookieA);

    expect(listRes.status).toBe(200);

    const convo = listRes.body.find((c) => c._id === conversationId);
    expect(convo).toBeDefined();
    expect(convo.lastMessage).not.toBeNull();
    expect(convo.lastMessage.content).toBe("Hello");
    expect(convo.lastMessage.isDeleted).toBe(false);
  });

  it("hides the conversation from the deleting user but preserves it for the other participant", async () => {
    mockEmit.mockClear();
    mockTo.mockClear();

    const resA = await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set("Cookie", cookieA);

    expect(resA.status).toBe(200);

    const convo = await Conversation.findById(conversationId);
    expect(convo).not.toBeNull();
    expect(convo.deletedBy.map((id) => id.toString())).toContain(userA._id.toString());

    const messages = await Message.find({ conversation: conversationId });
    expect(messages.length).toBeGreaterThan(0);

    // Verify it sent participant_deleted to the other participant
    expect(mockTo).toHaveBeenCalledWith(userB._id.toString());
    const call = mockEmit.mock.calls.find(call => call[0] === "conversation:participant_deleted");
    expect(call).toBeDefined();
    expect(call[1].conversationId.toString()).toBe(conversationId);
    expect(call[1].deletedBy.toString()).toBe(userA._id.toString());
  });

  it("does not hard-delete when all participants have soft-deleted — preserves conversation for future GC", async () => {
    mockEmit.mockClear();
    mockTo.mockClear();

    await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set("Cookie", cookieA);

    const resB = await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set("Cookie", cookieB);

    expect(resB.status).toBe(200);
    expect(resB.body.softDeleted).toBe(true);

    // Conversation and messages should still exist (no auto hard-delete)
    const convo = await Conversation.findById(conversationId);
    expect(convo).not.toBeNull();
    expect(convo.deletedBy.map((id) => id.toString())).toContain(userA._id.toString());
    expect(convo.deletedBy.map((id) => id.toString())).toContain(userB._id.toString());
    expect(await Message.countDocuments({ conversation: conversationId })).toBeGreaterThan(0);

    // Verify socket participant_deleted was sent to userA
    expect(mockTo).toHaveBeenCalledWith(userA._id.toString());
    const call = mockEmit.mock.calls.find(call => call[0] === "conversation:participant_deleted");
    expect(call).toBeDefined();
    expect(call[1].conversationId.toString()).toBe(conversationId);
  });

  it("returns 400 when a user tries to delete an already-deleted conversation", async () => {
    await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set("Cookie", cookieA);

    const res = await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set("Cookie", cookieA);

    expect(res.status).toBe(400);
  });

  it("returns 404 when an outsider tries to delete", async () => {
    const outsider = {
      name: "Out",
      surname: "Sider",
      phoneNumber: "6633333333",
      email: "convout@test.com",
      password: "Password123",
      username: "conv_outsider",
      bio: "Hi",
      description: "Not a participant",
    };
    const cookieOut = await loginUser(outsider);

    const res = await request(app)
      .delete(`/api/conversation/${conversationId}`)
      .set("Cookie", cookieOut);

    expect(res.status).toBe(404);
  });
});
