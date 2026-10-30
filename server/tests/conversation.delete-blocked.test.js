import { jest } from "@jest/globals";

// Issue #966: a user must be able to delete (soft-delete) a conversation from their own list
// whatever the block status is. Block checks stay on creating a conversation and sending a message.

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

const makeUser = (n) => ({
  name: "Blk",
  surname: `User${n}`,
  phoneNumber: `66${n}${n}${n}${n}${n}${n}${n}${n}`,
  email: `blk${n}@test.com`,
  password: "Password123",
  username: `blk_user_${n}`,
  bio: "Hi",
  description: `Block test user ${n}`,
});

const participantDeletedEmits = () =>
  mockEmit.mock.calls.filter((call) => call[0] === "conversation:participant_deleted");

describe("DELETE /api/conversation/:id with block status (issue #966)", () => {
  let cookieA, cookieB;
  let userA, userB;
  let conversationId;

  const block = (blocker, blocked) =>
    User.updateOne({ _id: blocker._id }, { $addToSet: { blockedUsers: blocked._id } });

  const deletedBy = async () => (await Conversation.findById(conversationId)).deletedBy.map(String);

  beforeEach(async () => {
    cookieA = await loginUser(makeUser(1));
    cookieB = await loginUser(makeUser(2));
    userA = await User.findOne({ username: "blk_user_1" });
    userB = await User.findOne({ username: "blk_user_2" });

    const convo = await Conversation.create({ participants: [userA._id, userB._id] });
    conversationId = convo._id.toString();
    await Message.create({ conversation: convo._id, sender: userA._id, content: "Hello" });

    mockEmit.mockClear();
    mockTo.mockClear();
  });

  it("lets the blocked user delete the conversation from their own list", async () => {
    await block(userB, userA); // B blocks A

    const res = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(res.body.softDeleted).toBe(true);
    expect(await deletedBy()).toEqual([userA._id.toString()]);
  });

  it("lets the user who did the blocking delete the conversation too", async () => {
    await block(userA, userB); // A blocks B

    const res = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(await deletedBy()).toEqual([userA._id.toString()]);
  });

  it("works when both users have blocked each other", async () => {
    await block(userA, userB);
    await block(userB, userA);

    const resA = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);
    const resB = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieB);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect((await deletedBy()).sort()).toEqual([userA._id.toString(), userB._id.toString()].sort());
  });

  it("only hides the conversation for the user who deleted it, and keeps the messages", async () => {
    await block(userB, userA);

    await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    const convo = await Conversation.findById(conversationId);
    expect(convo.deletedBy.map(String)).not.toContain(userB._id.toString());
    expect(await Message.countDocuments({ conversation: conversationId })).toBe(1);
  });

  it("does not tell someone who blocked you that you deleted the chat", async () => {
    await block(userB, userA);

    await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    expect(participantDeletedEmits()).toHaveLength(0);
    expect(mockTo).not.toHaveBeenCalledWith(userB._id.toString());
  });

  it("does not signal someone you blocked either", async () => {
    await block(userA, userB);

    await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    expect(participantDeletedEmits()).toHaveLength(0);
  });

  it("still notifies the other participant when nobody is blocked", async () => {
    const res = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    expect(res.status).toBe(200);
    expect(mockTo).toHaveBeenCalledWith(userB._id.toString());
    const [call] = participantDeletedEmits();
    expect(call[1].conversationId.toString()).toBe(conversationId);
    expect(call[1].deletedBy.toString()).toBe(userA._id.toString());
  });

  it("still reports an already-deleted conversation as 400 for a blocked user", async () => {
    await block(userB, userA);
    await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);

    const again = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieA);
    expect(again.status).toBe(400);
  });

  it("still returns 404 for someone who is not in the conversation, blocked or not", async () => {
    const cookieOut = await loginUser(makeUser(3));
    const outsider = await User.findOne({ username: "blk_user_3" });
    await block(userB, outsider);

    const res = await request(app).delete(`/api/conversation/${conversationId}`).set("Cookie", cookieOut);
    expect(res.status).toBe(404);
    expect(await deletedBy()).toEqual([]);
  });

  it("still requires authentication", async () => {
    const res = await request(app).delete(`/api/conversation/${conversationId}`);
    expect(res.status).toBe(401);
  });
});

describe("block checks that must stay in place", () => {
  let cookieA;
  let userA, userB;

  beforeEach(async () => {
    cookieA = await loginUser(makeUser(1));
    await loginUser(makeUser(2));
    userA = await User.findOne({ username: "blk_user_1" });
    userB = await User.findOne({ username: "blk_user_2" });
  });

  it("still refuses to start a conversation with someone who blocked you", async () => {
    await User.updateOne({ _id: userB._id }, { $addToSet: { blockedUsers: userA._id } });

    const res = await request(app)
      .post("/api/conversation")
      .set("Cookie", cookieA)
      .send({ receiverId: userB._id.toString() });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/block/i);
  });

  it("still refuses to send a message to someone who blocked you", async () => {
    const convo = await Conversation.create({ participants: [userA._id, userB._id] });
    await User.updateOne({ _id: userB._id }, { $addToSet: { blockedUsers: userA._id } });

    const res = await request(app)
      .post("/api/messages")
      .set("Cookie", cookieA)
      .send({ conversationId: convo._id.toString(), content: "hi" });

    expect(res.status).toBe(403);
  });
});
