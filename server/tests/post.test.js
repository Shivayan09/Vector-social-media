import request from 'supertest';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Post from '../src/models/post.model.js';
import { jest } from '@jest/globals';

describe('Post and Comment Flows', () => {
  let cookie;
  let user;
  let post;

  const testUser = {
    name: "Post",
    surname: "Tester",
    phoneNumber: "0987654321",
    email: "post@test.com",
    password: "password123",
    username: "posttester",
    bio: "Bio",
    description: "Desc"
  };

  beforeEach(async () => {
    // Register and login to get auth cookie
    await request(app).post('/api/auth/register').send(testUser);
    const loginRes = await request(app).post('/api/auth/login').send({
      username: testUser.username,
      password: testUser.password
    });
    cookie = loginRes.headers['set-cookie'];
    user = await User.findOne({ username: testUser.username });

    // Create a post
    post = await Post.create({
      author: user._id,
      content: "Initial Post Content",
      intent: "share"
    });
  });

  describe('Like Toggle', () => {
    it('should like and then unlike a post', async () => {
      // Like
      const likeRes = await request(app)
        .post(`/api/posts/like/${post._id}`)
        .set('Cookie', cookie);
      
      expect(likeRes.body.success).toBe(true);
      expect(likeRes.body.likesCount).toBe(1);
      expect(likeRes.body.liked).toBe(true);

      // Unlike
      const unlikeRes = await request(app)
        .post(`/api/posts/like/${post._id}`)
        .set('Cookie', cookie);
      
      expect(unlikeRes.body.success).toBe(true);
      expect(unlikeRes.body.likesCount).toBe(0);
      expect(unlikeRes.body.liked).toBe(false);
    });
  });

  describe('Comment Counts', () => {
    it('should increment and decrement comment count', async () => {
      // Add comment
      const addRes = await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie)
        .send({ content: "This is a comment" });
      
      expect(addRes.status).toBe(201);
      
      const postWithComment = await Post.findById(post._id);
      expect(postWithComment.commentsCount).toBe(1);

      // Delete comment
      const commentId = addRes.body._id;
      const deleteRes = await request(app)
        .delete(`/api/comments/delete/${commentId}`)
        .set('Cookie', cookie);
      
      expect(deleteRes.body.success).toBe(true);
      
      const postAfterDelete = await Post.findById(post._id);
      expect(postAfterDelete.commentsCount).toBe(0);
    });
  });
});
