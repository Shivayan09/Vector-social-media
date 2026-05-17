import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Notification from '../src/models/notification.model.js';
import jwt from 'jsonwebtoken';

describe('User Follow Request Flows', () => {
  let user1, user2, user3;
  let token1, token2;

  beforeEach(async () => {
    // Create three test users: User1 (Public), User2 (Private), User3 (Public)
    user1 = await User.create({
      name: "User One",
      username: "userone",
      email: "userone@example.com",
      password: "password123",
      isPrivate: false
    });

    user2 = await User.create({
      name: "User Two",
      username: "usertwo",
      email: "usertwo@example.com",
      password: "password123",
      isPrivate: true
    });

    user3 = await User.create({
      name: "User Three",
      username: "userthree",
      email: "userthree@example.com",
      password: "password123",
      isPrivate: false
    });

    token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET);
    token2 = jwt.sign({ id: user2._id }, process.env.JWT_SECRET);
  });

  describe('PUT /api/users/:id/follow', () => {
    it('should immediately follow a public account and create a follow notification', async () => {
      const response = await request(app)
        .put(`/api/users/${user3._id}/follow`)
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.followed).toBe(true);

      // Verify db changes
      const updatedUser1 = await User.findById(user1._id);
      const updatedUser3 = await User.findById(user3._id);

      expect(updatedUser1.following.map(id => id.toString())).toContain(user3._id.toString());
      expect(updatedUser1.followingCount).toBe(1);
      expect(updatedUser3.followers.map(id => id.toString())).toContain(user1._id.toString());
      expect(updatedUser3.followersCount).toBe(1);

      // Verify notification
      const notification = await Notification.findOne({
        recipient: user3._id,
        sender: user1._id,
        type: "follow"
      });
      expect(notification).not.toBeNull();
    });

    it('should unfollow an already followed public account', async () => {
      // Setup: user1 follows user3
      await User.findByIdAndUpdate(user1._id, { $addToSet: { following: user3._id }, $inc: { followingCount: 1 } });
      await User.findByIdAndUpdate(user3._id, { $addToSet: { followers: user1._id }, $inc: { followersCount: 1 } });

      const response = await request(app)
        .put(`/api/users/${user3._id}/follow`)
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.followed).toBe(false);

      // Verify db changes
      const updatedUser1 = await User.findById(user1._id);
      const updatedUser3 = await User.findById(user3._id);

      expect(updatedUser1.following.map(id => id.toString())).not.toContain(user3._id.toString());
      expect(updatedUser1.followingCount).toBe(0);
      expect(updatedUser3.followers.map(id => id.toString())).not.toContain(user1._id.toString());
      expect(updatedUser3.followersCount).toBe(0);
    });

    it('should create a pending follow request for a private account and create a follow_request notification', async () => {
      const response = await request(app)
        .put(`/api/users/${user2._id}/follow`)
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.requested).toBe(true);
      expect(response.body.message).toBe("Follow request sent");

      // Verify db changes
      const updatedUser2 = await User.findById(user2._id);
      expect(updatedUser2.followRequests.map(id => id.toString())).toContain(user1._id.toString());

      // Verify notification
      const notification = await Notification.findOne({
        recipient: user2._id,
        sender: user1._id,
        type: "follow_request"
      });
      expect(notification).not.toBeNull();
    });

    it('should cancel a pending follow request for a private account if already requested and delete notification', async () => {
      // Setup: follow request sent and notification created
      await User.findByIdAndUpdate(user2._id, { $addToSet: { followRequests: user1._id } });
      await Notification.create({
        recipient: user2._id,
        sender: user1._id,
        type: "follow_request"
      });

      const response = await request(app)
        .put(`/api/users/${user2._id}/follow`)
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.requested).toBe(false);
      expect(response.body.message).toBe("Follow request cancelled");

      // Verify db changes
      const updatedUser2 = await User.findById(user2._id);
      expect(updatedUser2.followRequests.map(id => id.toString())).not.toContain(user1._id.toString());

      // Verify notification deleted
      const notification = await Notification.findOne({
        recipient: user2._id,
        sender: user1._id,
        type: "follow_request"
      });
      expect(notification).toBeNull();
    });

    it('should not allow a user to follow themselves', async () => {
      const response = await request(app)
        .put(`/api/users/${user1._id}/follow`)
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("You cannot follow yourself");
    });

    it('should block follow action if there is a block status', async () => {
      // User1 blocks User3
      await User.findByIdAndUpdate(user1._id, { $addToSet: { blockedUsers: user3._id } });

      const response = await request(app)
        .put(`/api/users/${user3._id}/follow`)
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("Cannot perform action due to block status");
    });
  });

  describe('GET /api/users/follow-requests', () => {
    it('should retrieve pending follow requests for the authenticated user', async () => {
      // User1 and User3 request to follow User2
      await User.findByIdAndUpdate(user2._id, { $addToSet: { followRequests: [user1._id, user3._id] } });

      const response = await request(app)
        .get('/api/users/follow-requests')
        .set('Cookie', `token=${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(2);
      
      const usernames = response.body.map(u => u.username);
      expect(usernames).toContain('userone');
      expect(usernames).toContain('userthree');
      // Verify metadata is populated
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('avatar');
    });
  });

  describe('GET /api/users/follow-requests/sent', () => {
    it('should retrieve sent follow requests from the authenticated user', async () => {
      // User1 sent follow request to User2
      await User.findByIdAndUpdate(user2._id, { $addToSet: { followRequests: user1._id } });

      const response = await request(app)
        .get('/api/users/follow-requests/sent')
        .set('Cookie', `token=${token1}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].username).toBe('usertwo');
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('avatar');
    });
  });

  describe('PUT /api/users/:id/accept-request', () => {
    it('should accept a pending follow request, update counts, and create accept notification', async () => {
      // Setup: User1 requested User2
      await User.findByIdAndUpdate(user2._id, { $addToSet: { followRequests: user1._id } });

      const response = await request(app)
        .put(`/api/users/${user1._id}/accept-request`)
        .set('Cookie', `token=${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Follow request accepted");

      // Verify db changes
      const updatedUser1 = await User.findById(user1._id);
      const updatedUser2 = await User.findById(user2._id);

      expect(updatedUser2.followRequests.map(id => id.toString())).not.toContain(user1._id.toString());
      expect(updatedUser2.followers.map(id => id.toString())).toContain(user1._id.toString());
      expect(updatedUser2.followersCount).toBe(1);

      expect(updatedUser1.following.map(id => id.toString())).toContain(user2._id.toString());
      expect(updatedUser1.followingCount).toBe(1);

      // Verify notification
      const notification = await Notification.findOne({
        recipient: user1._id,
        sender: user2._id,
        type: "follow_request_accepted"
      });
      expect(notification).not.toBeNull();
    });

    it('should return 400 if there is no pending request from the user', async () => {
      const response = await request(app)
        .put(`/api/users/${user1._id}/accept-request`)
        .set('Cookie', `token=${token2}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No follow request from this user");
    });
  });

  describe('PUT /api/users/:id/reject-request', () => {
    it('should reject a pending follow request and update the database', async () => {
      // Setup: User1 requested User2
      await User.findByIdAndUpdate(user2._id, { $addToSet: { followRequests: user1._id } });

      const response = await request(app)
        .put(`/api/users/${user1._id}/reject-request`)
        .set('Cookie', `token=${token2}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Follow request rejected");

      // Verify db changes
      const updatedUser2 = await User.findById(user2._id);
      expect(updatedUser2.followRequests.map(id => id.toString())).not.toContain(user1._id.toString());
      expect(updatedUser2.followers.map(id => id.toString())).not.toContain(user1._id.toString());
      expect(updatedUser2.followersCount).toBe(0);
    });

    it('should return 400 if there is no pending request from the user', async () => {
      const response = await request(app)
        .put(`/api/users/${user1._id}/reject-request`)
        .set('Cookie', `token=${token2}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No follow request from this user");
    });
  });
});
