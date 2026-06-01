import { jest } from "@jest/globals";
import request from "supertest";

jest.unstable_mockModule("nodemailer", () => ({
  default: {
    createTransport: jest.fn().mockReturnValue({
      sendMail: jest.fn().mockResolvedValue({ messageId: "mock_id" }),
    }),
  },
}));

const { default: app } = await import("../src/app.js");
const { default: User } = await import("../src/models/user.model.js");

describe('Auth Endpoints', () => {
  const validUser = {
    name: "Test",
    surname: "User",
    phoneNumber: "1234567890",
    email: "test@example.com",
    password: "Password123",
    username: "testuser",
    bio: "Test bio",
    description: "Test description"
  };

  describe('POST /api/auth/register', () => {
    it('should fail registration if name is missing', async () => {
      const userWithoutName = { ...validUser };
      delete userWithoutName.name;
      const response = await request(app)
        .post('/api/auth/register')
        .send(userWithoutName);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Please enter your name!");
    });

    it('should fail if email is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ ...validUser, email: "not-an-email" });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Please enter a valid email!");
    });

    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Account created successfully");

      const user = await User.findOne({ email: validUser.email });
      expect(user).toBeDefined();
      expect(user.username).toBe(validUser.username);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should login successfully with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: validUser.username,
          password: validUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe("Logged In successfully");
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should fail login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: validUser.username,
          password: "wrongpassword"
        });

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe("Invalid username or password.");
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
    });

    it('should return success even if user does not exist to avoid user enumeration', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });

    it('should return success if user exists', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: validUser.email });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password reset email sent successfully');
    });
  });

  describe('Token version validation (optionalAuth and authMiddleware)', () => {
    let cookie;
    let user;

    beforeEach(async () => {
      await request(app).post('/api/auth/register').send(validUser);
      const loginRes = await request(app).post('/api/auth/login').send({
        username: validUser.username,
        password: validUser.password
      });
      cookie = loginRes.headers['set-cookie'];
      user = await User.findOne({ username: validUser.username });
    });

    it('should authenticate the user for optionalAuth when token is valid and version matches', async () => {
      const res = await request(app)
        .get('/api/posts')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
    });

    it('should treat user as unauthenticated for optionalAuth after password reset (tokenVersion mismatch)', async () => {
      // 1. Reset password / increment token version in DB
      user.tokenVersion = (user.tokenVersion || 0) + 1;
      await user.save();

      // 2. Request optionalAuth endpoint with old cookie (which contains old version)
      // Since it is optional, the endpoint should STILL succeed (status 200) but it should NOT use user's context (e.g. blockers, following)
      const optionalRes = await request(app)
        .get('/api/posts')
        .set('Cookie', cookie);

      expect(optionalRes.status).toBe(200);

      // Now verify authMiddleware fails with 401
      const authRequiredRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(authRequiredRes.status).toBe(401);
      expect(authRequiredRes.body.success).toBe(false);
      expect(authRequiredRes.body.message).toContain("Token invalidated due to password reset!");
    });

    it('should invalidate captured token immediately after logout (tokenVersion mismatch)', async () => {
      const beforeVersion = user.tokenVersion || 0;

      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);

      expect(logoutRes.status).toBe(200);

      const updated = await User.findOne({ username: validUser.username });
      expect(updated.tokenVersion).toBe(beforeVersion + 1);

      const replayRes = await request(app)
        .get('/api/auth/me')
        .set('Cookie', cookie);

      expect(replayRes.status).toBe(401);
      expect(replayRes.body.success).toBe(false);
    });
  });
});
