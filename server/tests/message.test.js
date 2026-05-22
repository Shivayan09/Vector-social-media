import { jest } from '@jest/globals';

// ─── Mock socket.io BEFORE importing app ─────────────────────────────────────
jest.unstable_mockModule('../src/socket/socket.js', () => ({
  getIO: () => ({
    to: () => ({ emit: () => {} }),
    emit: () => {},
  }),
  onlineUsers: new Map(),
}));

// ─── Imports AFTER mock ───────────────────────────────────────────────────────
const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: Conversation } = await import('../src/models/conversation.model.js');
const { default: Message } = await import('../src/models/message.model.js');
const { default: User } = await import('../src/models/user.model.js');

// ─── Helper: register + login, return cookie ──────────────────────────────────
const loginUser = async (userData) => {
  await request(app).post('/api/auth/register').send(userData);
  const res = await request(app).post('/api/auth/login').send({
    username: userData.username,
    password: userData.password,
  });
  return res.headers['set-cookie'];
};

// ─── Test Data ────────────────────────────────────────────────────────────────
const userAData = {
  name: 'User',
  surname: 'Alpha',
  phoneNumber: '1111111111',
  email: 'usera@test.com',
  password: 'password123',
  username: 'user_alpha',
  bio: 'Hi',
  description: 'Test user A',
};

const userBData = {
  name: 'User',
  surname: 'Beta',
  phoneNumber: '2222222222',
  email: 'userb@test.com',
  password: 'password123',
  username: 'user_beta',
  bio: 'Hi',
  description: 'Test user B',
};

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Message Endpoints', () => {
  let cookieA, cookieB;
  let userA, userB;
  let conversationId;

  beforeEach(async () => {
    // Re-register and login before EACH test because setup.js clears DB after each test
    cookieA = await loginUser(userAData);
    cookieB = await loginUser(userBData);

    userA = await User.findOne({ username: userAData.username });
    userB = await User.findOne({ username: userBData.username });

    const conversation = await Conversation.create({
      participants: [userA._id, userB._id],
    });
    conversationId = conversation._id.toString();
  });

  // ── Send Message ─────────────────────────────────────────────────────────────
  describe('POST /api/messages - Send Message', () => {

    it('should send a message successfully', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Hello there!' });

      expect(res.status).toBe(200);
      expect(res.body.content).toBe('Hello there!');
      expect(res.body.sender).toBeDefined();
    });

    it('should return 400 if content is missing', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Missing fields');
    });

    it('should return 400 if conversationId is missing', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ content: 'Hello!' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Missing fields');
    });

    it('should return 404 if conversation does not exist', async () => {
      const res = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId: '000000000000000000000000', content: 'Hello!' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Conversation not found');
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .post('/api/messages')
        .send({ conversationId, content: 'Hello!' });

      expect(res.status).toBe(401);
    });

  });

  // ── Get Messages ─────────────────────────────────────────────────────────────
  describe('GET /api/messages/:conversationId - Fetch Messages', () => {

    it('should fetch messages for a conversation', async () => {
      // Send a message first so there is something to fetch
      await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Fetch me!' });

      const res = await request(app)
        .get(`/api/messages/${conversationId}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      expect(res.body[0].content).toBe('Fetch me!');
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .get(`/api/messages/${conversationId}`);

      expect(res.status).toBe(401);
    });

  });

  // ── Mark as Read ─────────────────────────────────────────────────────────────
  describe('PATCH /api/messages/:conversationId/read-all - Mark as Read', () => {

    it('should mark all messages as read', async () => {
      // userA sends a message
      await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Mark this as read' });

      // userB marks it as read
      const res = await request(app)
        .patch(`/api/messages/${conversationId}/read-all`)
        .set('Cookie', cookieB);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Messages marked as read');

      // Verify in DB — no unread messages left
      const unread = await Message.countDocuments({
        conversation: conversationId,
        isRead: false,
      });
      expect(unread).toBe(0);
    });

    it('should return 403 if user is not a participant', async () => {
      const outsiderData = {
        name: 'Out',
        surname: 'Sider',
        phoneNumber: '3333333333',
        email: 'outsider@test.com',
        password: 'password123',
        username: 'outsider_user',
        bio: 'Hi',
        description: 'Not in this conversation',
      };
      const outsiderCookie = await loginUser(outsiderData);

      const res = await request(app)
        .patch(`/api/messages/${conversationId}/read-all`)
        .set('Cookie', outsiderCookie);

      expect(res.status).toBe(403);
    });

    it('should return 401 if user is not authenticated', async () => {
      const res = await request(app)
        .patch(`/api/messages/${conversationId}/read-all`);

      expect(res.status).toBe(401);
    });

  });

  // ── Delete Message ────────────────────────────────────────────────────────────
  describe('DELETE /api/messages/:messageId - Delete Message', () => {

    it('should soft delete a message by the sender', async () => {
      const sendRes = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Delete me' });

      const messageId = sendRes.body._id;

      const res = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Message deleted successfully');

      // Verify soft delete — message still in DB but isDeleted = true
      const deleted = await Message.findById(messageId);
      expect(deleted.isDeleted).toBe(true);
      expect(deleted.deletedAt).toBeDefined();
    });

    it('should return 403 if a different user tries to delete', async () => {
      const sendRes = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Only A can delete this' });

      const messageId = sendRes.body._id;

      // userB tries to delete userA's message
      const res = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Cookie', cookieB);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('Not allowed');
    });

    it('should return 404 if message does not exist', async () => {
      const res = await request(app)
        .delete('/api/messages/000000000000000000000000')
        .set('Cookie', cookieA);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Message not found');
    });

    it('should return 400 if message is already deleted', async () => {
      const sendRes = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Already gone' });

      const messageId = sendRes.body._id;

      // First delete
      await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Cookie', cookieA);

      // Try again
      const res = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Cookie', cookieA);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Message already deleted');
    });

    it('should return 401 if user is not authenticated', async () => {
      const sendRes = await request(app)
        .post('/api/messages')
        .set('Cookie', cookieA)
        .send({ conversationId, content: 'Auth check' });

      const messageId = sendRes.body._id;

      const res = await request(app)
        .delete(`/api/messages/${messageId}`);

      expect(res.status).toBe(401);
    });

  });

});