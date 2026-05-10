import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import { jest } from '@jest/globals';

describe('Auth Endpoints', () => {
  const validUser = {
    name: "Test",
    surname: "User",
    phoneNumber: "1234567890",
    email: "test@example.com",
    password: "password123",
    username: "testuser",
    bio: "Test bio",
    description: "Test description"
  };

  describe('POST /api/auth/register', () => {
    it('should fail registration if name is missing', async () => {
      const { name, ...userWithoutName } = validUser;
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
      
      expect(response.status).toBe(200);
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
      expect(response.body.message).toBe("Incorrect password!");
    });
  });
});
