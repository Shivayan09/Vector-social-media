import { jest } from "@jest/globals";
import request from "supertest";
import jwt from "jsonwebtoken";
import User from "../src/models/user.model.js";
import Follow from "../src/models/follow.model.js";
import Post from "../src/models/post.model.js";

// Mock socket to avoid "Socket.io not initialized" error in block/unblock controllers
jest.unstable_mockModule("../src/socket/socket.js", () => ({
  getIO: () => ({ to: () => ({ emit: () => {} }) }),
}));

const { default: app } = await import("../src/app.js");

function cookieFor(user) {
  return `token=${jwt.sign({ id: user._id }, process.env.JWT_SECRET)}`;
}

describe("Block System Integrity", () => {
  describe("TOCTOU follow bypass — atomic blockedUsers guard", () => {
    it("should reject a follow when the target has blocked the requester", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_f1@test.com", username: "alice_f1", password: "pwd123", bio: "", description: "", isPrivate: false,
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_f1@test.com", username: "bob_f1", password: "pwd123", bio: "", description: "", isPrivate: false,
      });

      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });

      const res = await request(app)
        .put(`/api/users/${bob._id}/follow`)
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);

      // Verify no Follow document was created
      const followDoc = await Follow.findOne({ follower: alice._id, following: bob._id });
      expect(followDoc).toBeNull();
    });

    it("should reject a follow when the requester has blocked the target", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_f2@test.com", username: "alice_f2", password: "pwd123", bio: "", description: "", isPrivate: false,
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_f2@test.com", username: "bob_f2", password: "pwd123", bio: "", description: "", isPrivate: false,
      });

      await User.updateOne({ _id: alice._id }, { $addToSet: { blockedUsers: bob._id } });

      const res = await request(app)
        .put(`/api/users/${bob._id}/follow`)
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });

    it("should not create a follow relationship when the target blocked the requester concurrently", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_f3@test.com", username: "alice_f3", password: "pwd123", bio: "", description: "", isPrivate: false,
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_f3@test.com", username: "bob_f3", password: "pwd123", bio: "", description: "", isPrivate: false,
      });

      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });

      await request(app)
        .put(`/api/users/${bob._id}/follow`)
        .set("Cookie", cookieFor(alice));

      // Verify no Follow document was created
      const updatedFollow = await Follow.findOne({ follower: alice._id, following: bob._id });
      expect(updatedFollow).toBeNull();
    });
  });

  describe("TOCTOU accept-follow bypass — atomic blockedUsers guard", () => {
    it("should prevent accept when requester blocked the accepter", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_af1@test.com", username: "alice_af1", password: "pwd123", bio: "", description: "", isPrivate: true,
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_af1@test.com", username: "bob_af1", password: "pwd123", bio: "", description: "", isPrivate: false,
      });

      // Bob blocks Alice (the one who would accept), AND seed a pending follow request from bob to alice
      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });
      await Follow.create({ follower: bob._id, following: alice._id, status: 'pending' });

      const res = await request(app)
        .put(`/api/users/${bob._id}/accept-request`)
        .set("Cookie", cookieFor(alice));

      // Should be rejected due to block status
      expect(res.status).toBe(403);

      // Verify Follow document was NOT promoted to accepted
      const followDoc = await Follow.findOne({ follower: bob._id, following: alice._id });
      expect(followDoc?.status).not.toBe('accepted');
    });
  });

  describe("TOCTOU like bypass — post-verify undo", () => {
    it("should undo a like if the author blocked the liker during the write window", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_lk1@test.com", username: "alice_lk1", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_lk1@test.com", username: "bob_lk1", password: "pwd123", bio: "", description: "",
      });

      const post = await Post.create({ author: bob._id, content: "Test post", intent: "share" });

      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });

      await request(app)
        .post(`/api/posts/like/${post._id}`)
        .set("Cookie", cookieFor(alice));

      const updatedPost = await Post.findById(post._id);
      expect(updatedPost.likes.map((id) => id.toString())).not.toContain(alice._id.toString());
    });

    it("should reject a like if the liker has blocked the author", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_lk2@test.com", username: "alice_lk2", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_lk2@test.com", username: "bob_lk2", password: "pwd123", bio: "", description: "",
      });

      const post = await Post.create({ author: bob._id, content: "Test post", intent: "share" });

      await User.updateOne({ _id: alice._id }, { $addToSet: { blockedUsers: bob._id } });

      const res = await request(app)
        .post(`/api/posts/like/${post._id}`)
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });
  });

  describe("TOCTOU comment bypass — re-verify before create", () => {
    it("should reject a comment if the author blocked the commenter before create", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_cm1@test.com", username: "alice_cm1", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_cm1@test.com", username: "bob_cm1", password: "pwd123", bio: "", description: "",
      });

      const post = await Post.create({ author: bob._id, content: "Test post", intent: "discuss" });

      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });

      const res = await request(app)
        .post(`/api/comments/${post._id}`)
        .send({ content: "Nice post!" })
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });

    it("should reject a comment if the commenter has blocked the author", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_cm2@test.com", username: "alice_cm2", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_cm2@test.com", username: "bob_cm2", password: "pwd123", bio: "", description: "",
      });

      const post = await Post.create({ author: bob._id, content: "Test post", intent: "discuss" });

      await User.updateOne({ _id: alice._id }, { $addToSet: { blockedUsers: bob._id } });

      const res = await request(app)
        .post(`/api/comments/${post._id}`)
        .send({ content: "Nice post!" })
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });
  });

  describe("TOCTOU conversation bypass — re-verify before create", () => {
    it("should reject a conversation if the receiver blocked the sender", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_cv1@test.com", username: "alice_cv1", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_cv1@test.com", username: "bob_cv1", password: "pwd123", bio: "", description: "",
      });

      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });

      const res = await request(app)
        .post("/api/conversation")
        .send({ receiverId: bob._id })
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });

    it("should reject a conversation if the sender has blocked the receiver", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_cv2@test.com", username: "alice_cv2", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_cv2@test.com", username: "bob_cv2", password: "pwd123", bio: "", description: "",
      });

      await User.updateOne({ _id: alice._id }, { $addToSet: { blockedUsers: bob._id } });

      const res = await request(app)
        .post("/api/conversation")
        .send({ receiverId: bob._id })
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });
  });

  describe("TOCTOU message bypass — re-verify before create", () => {
    it("should reject a message if the receiver blocked the sender before create", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_ms1@test.com", username: "alice_ms1", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_ms1@test.com", username: "bob_ms1", password: "pwd123", bio: "", description: "",
      });

      const convoRes = await request(app)
        .post("/api/conversation")
        .send({ receiverId: bob._id })
        .set("Cookie", cookieFor(alice));
      const conversationId = convoRes.body._id;

      await User.updateOne({ _id: bob._id }, { $addToSet: { blockedUsers: alice._id } });

      const res = await request(app)
        .post("/api/messages")
        .send({ conversationId, content: "Hello" })
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });

    it("should reject a message if the sender has blocked the receiver", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_ms2@test.com", username: "alice_ms2", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_ms2@test.com", username: "bob_ms2", password: "pwd123", bio: "", description: "",
      });

      const convoRes = await request(app)
        .post("/api/conversation")
        .send({ receiverId: bob._id })
        .set("Cookie", cookieFor(alice));
      const conversationId = convoRes.body._id;

      await User.updateOne({ _id: alice._id }, { $addToSet: { blockedUsers: bob._id } });

      const res = await request(app)
        .post("/api/messages")
        .send({ conversationId, content: "Hello" })
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(403);
    });
  });

  describe("Block socket events", () => {
    it("should block a user and persist in database", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_be1@test.com", username: "alice_be1", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_be1@test.com", username: "bob_be1", password: "pwd123", bio: "", description: "",
      });

      const res = await request(app)
        .put(`/api/users/${bob._id}/block`)
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedAlice = await User.findById(alice._id);
      expect(updatedAlice.blockedUsers.map((id) => id.toString())).toContain(bob._id.toString());
    });

    it("should unblock a user and persist in database", async () => {
      const alice = await User.create({
        name: "Alice", surname: "A", email: "alice_ube1@test.com", username: "alice_ube1", password: "pwd123", bio: "", description: "",
      });
      const bob = await User.create({
        name: "Bob", surname: "B", email: "bob_ube1@test.com", username: "bob_ube1", password: "pwd123", bio: "", description: "",
      });

      alice.blockedUsers = [bob._id];
      await alice.save();

      const res = await request(app)
        .put(`/api/users/${bob._id}/unblock`)
        .set("Cookie", cookieFor(alice));

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const updatedAlice = await User.findById(alice._id);
      expect(updatedAlice.blockedUsers.map((id) => id.toString())).not.toContain(bob._id.toString());
    });
  });
});
