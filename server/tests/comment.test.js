const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/user.model.js');
const { default: Post } = await import('../src/models/post.model.js');
const { default: Comment } = await import('../src/models/comment.model.js');

describe('Comment Routes', () => {
  let cookie1;
  let cookie2;
  let user1;
  let post;

  const testUser1 = {
    name: "Comment",
    surname: "Tester",
    phoneNumber: "0987654321",
    email: "comment1@test.com",
    password: "Password123",
    username: "commenttester1",
    bio: "Bio",
    description: "Desc"
  };

  const testUser2 = {
    name: "Other",
    surname: "Tester",
    phoneNumber: "1112223333",
    email: "comment2@test.com",
    password: "Password123",
    username: "commenttester2",
    bio: "Bio",
    description: "Desc"
  };

  beforeEach(async () => {
    // Register and login User 1
    await request(app).post('/api/auth/register').send(testUser1);
    const loginRes1 = await request(app).post('/api/auth/login').send({
      username: testUser1.username,
      password: testUser1.password
    });
    cookie1 = loginRes1.headers['set-cookie'];
    user1 = await User.findOne({ username: testUser1.username });

    // Register and login User 2
    await request(app).post('/api/auth/register').send(testUser2);
    const loginRes2 = await request(app).post('/api/auth/login').send({
      username: testUser2.username,
      password: testUser2.password
    });
    cookie2 = loginRes2.headers['set-cookie'];

    // Create a fresh post for each test
    post = await Post.create({
      author: user1._id,
      content: "Initial Post for comments",
      intent: "share"
    });
  });

  describe('POST /api/comments/add/:postId', () => {
    it('should add a comment successfully and increment commentsCount', async () => {
      const res = await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie1)
        .send({ content: "This is a great post!" });

      expect(res.status).toBe(201);
      expect(res.body.content).toBe("This is a great post!");
      expect(res.body.author.username).toBe(user1.username);

      const dbPost = await Post.findById(post._id);
      expect(dbPost.commentsCount).toBe(1);
    });

    it('should return 400 if comment content is empty or whitespace', async () => {
      const res1 = await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie1)
        .send({ content: "" });
      
      expect(res1.status).toBe(400);
      expect(res1.body.message).toBe("Comment cannot be empty");

      const res2 = await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie1)
        .send({ content: "    " });
      
      expect(res2.status).toBe(400);
      expect(res2.body.message).toBe("Comment cannot be empty");

      const dbPost = await Post.findById(post._id);
      expect(dbPost.commentsCount).toBe(0);
    });

    it('should return 404 if post is not found', async () => {
      const nonExistentId = '60c72b2f9b1d8e1f88ef8b5a';
      const res = await request(app)
        .post(`/api/comments/add/${nonExistentId}`)
        .set('Cookie', cookie1)
        .send({ content: "Testing non-existent post" });
      
      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Post not found");
    });
  });

  describe('GET /api/comments/:postId', () => {
    it('should get comments for a specific post', async () => {
      // Add comments
      await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie1)
        .send({ content: "Comment 1" });
        
      await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie2)
        .send({ content: "Comment 2" });

      const res = await request(app)
        .get(`/api/comments/${post._id}`)
        .set('Cookie', cookie1);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0].content).toBe("Comment 1");
      expect(res.body[1].content).toBe("Comment 2");
      expect(res.body[0].author).toBeDefined();
    });

    it('should return 404 if trying to get comments for non-existent post', async () => {
      const nonExistentId = '60c72b2f9b1d8e1f88ef8b5a';
      const res = await request(app)
        .get(`/api/comments/${nonExistentId}`)
        .set('Cookie', cookie1);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Post not found");
    });
  });

  describe('DELETE /api/comments/delete/:commentId', () => {
    let commentId;

    beforeEach(async () => {
      const addRes = await request(app)
        .post(`/api/comments/add/${post._id}`)
        .set('Cookie', cookie1)
        .send({ content: "Comment to be deleted" });
      
      commentId = addRes.body._id;
    });

    it('should delete a comment successfully and decrement commentsCount', async () => {
      const preDeletePost = await Post.findById(post._id);
      expect(preDeletePost.commentsCount).toBe(1);

      const res = await request(app)
        .delete(`/api/comments/delete/${commentId}`)
        .set('Cookie', cookie1);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const dbComment = await Comment.findById(commentId);
      expect(dbComment).toBeNull();

      const postAfterDelete = await Post.findById(post._id);
      expect(postAfterDelete.commentsCount).toBe(0);
    });

    it('should return 403 if an unauthorized user tries to delete the comment', async () => {
      const res = await request(app)
        .delete(`/api/comments/delete/${commentId}`)
        .set('Cookie', cookie2);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe("Not allowed");

      // Verify comment still exists
      const dbComment = await Comment.findById(commentId);
      expect(dbComment).toBeDefined();

      const postAfterFailedDelete = await Post.findById(post._id);
      expect(postAfterFailedDelete.commentsCount).toBe(1);
    });

    it('should return 404 if comment is not found', async () => {
      const nonExistentId = '60c72b2f9b1d8e1f88ef8b5a';
      const res = await request(app)
        .delete(`/api/comments/delete/${nonExistentId}`)
        .set('Cookie', cookie1);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Comment not found");
    });
  });
});
