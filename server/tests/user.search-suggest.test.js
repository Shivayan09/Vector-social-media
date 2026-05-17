import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Post from '../src/models/post.model.js';
import jwt from 'jsonwebtoken';

describe('User Search and Suggestions Endpoints', () => {
  let user1, user2, user3, user4;
  let token1;

  beforeEach(async () => {
    // Clean up collections (handled by setup.js but good to be explicit for Posts if needed, setup.js does all collections)
    
    // Create test users
    user1 = await User.create({
      name: "Alice",
      surname: "Smith",
      username: "alicesmith",
      email: "alice@example.com",
      password: "password123",
      bio: "Hello world"
    });

    user2 = await User.create({
      name: "Bob",
      surname: "Jones",
      username: "bobjones",
      email: "bob@example.com",
      password: "password123",
    });

    user3 = await User.create({
      name: "Charlie",
      surname: "Brown",
      username: "charlieb",
      email: "charlie@example.com",
      password: "password123",
    });

    user4 = await User.create({
      name: "Alice",
      surname: "Wonderland",
      username: "alicew",
      email: "alicew@example.com",
      password: "password123",
    });

    token1 = jwt.sign({ id: user1._id }, process.env.JWT_SECRET);
  });

  describe('GET /api/users/search', () => {
    it('should return empty arrays when no query is provided', async () => {
      const response = await request(app)
        .get('/api/users/search')
        .set('Cookie', `token=${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users).toEqual([]);
      expect(response.body.posts).toEqual([]);
    });

    it('should find users matching query by name or username', async () => {
      const response = await request(app)
        .get('/api/users/search?query=alice')
        .set('Cookie', `token=${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.users.length).toBe(1); // alicesmith (self) is excluded, only alicew is returned
      expect(response.body.users.some(u => u.username === 'alicew')).toBe(true);
      expect(response.body.posts).toEqual([]);
    });

    it('should not return blocked users in search results', async () => {
      // User1 blocks User4
      await User.findByIdAndUpdate(user1._id, { $addToSet: { blockedUsers: user4._id } });

      const response = await request(app)
        .get('/api/users/search?query=alice')
        .set('Cookie', `token=${token1}`);
      
      expect(response.status).toBe(200);
      // Both alicesmith (self) and alicew (blocked) are excluded
      expect(response.body.users.length).toBe(0);
    });

    it('should find posts matching query in content or intent', async () => {
      await Post.create({
        content: "Learning about alice in wonderland",
        intent: "share",
        author: user2._id
      });

      const response = await request(app)
        .get('/api/users/search?query=alice')
        .set('Cookie', `token=${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBe(1);
      expect(response.body.posts[0].content).toContain("alice");
    });
  });

  describe('GET /api/users/suggestions', () => {
    it('should return 401 if unauthorized', async () => {
      const response = await request(app).get('/api/users/suggestions');
      expect(response.status).toBe(401);
    });

    it('should return suggested users excluding self, blocked, and already following', async () => {
      // User1 follows User2
      await User.findByIdAndUpdate(user1._id, { $addToSet: { following: user2._id } });
      // User1 blocks User3
      await User.findByIdAndUpdate(user1._id, { $addToSet: { blockedUsers: user3._id } });

      const response = await request(app)
        .get('/api/users/suggestions')
        .set('Cookie', `token=${token1}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Should only suggest user4
      const suggestedUsernames = response.body.users.map(u => u.username);
      expect(suggestedUsernames).toContain('alicew');
      expect(suggestedUsernames).not.toContain('alicesmith'); // self
      expect(suggestedUsernames).not.toContain('bobjones');   // following
      expect(suggestedUsernames).not.toContain('charlieb');   // blocked
    });

    it('should correctly mark isRequestedByCurrentUser if follow request is pending', async () => {
      // User1 sends follow request to User2
      await User.findByIdAndUpdate(user2._id, { $addToSet: { followRequests: user1._id } });

      const response = await request(app)
        .get('/api/users/suggestions')
        .set('Cookie', `token=${token1}`);
      
      expect(response.status).toBe(200);
      
      const suggestedBob = response.body.users.find(u => u.username === 'bobjones');
      expect(suggestedBob).toBeDefined();
      expect(suggestedBob.isRequestedByCurrentUser).toBe(true);
    });
  });
});
