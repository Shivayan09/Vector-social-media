import { jest } from '@jest/globals';

export const mockDestroy = jest.fn().mockResolvedValue({ result: 'ok' });

jest.unstable_mockModule('../src/config/cloudinary.js', () => ({
  default: {
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://res.cloudinary.com/dummy-cloud/image/upload/v12345/posts/dummy_image.png',
        public_id: 'posts/dummy_image_public_id'
      }),
      destroy: mockDestroy
    }
  }
}));

// Dynamic imports to ensure mocks are registered
const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/user.model.js');
const { default: Post } = await import('../src/models/post.model.js');
const { default: Comment } = await import('../src/models/comment.model.js');
const { default: Notification } = await import('../src/models/notification.model.js');

describe('Post and Comment Flows', () => {
  let cookie;
  let user;
  let post;

  const testUser = {
    name: "Post",
    surname: "Tester",
    phoneNumber: "0987654321",
    email: "post@test.com",
    password: "Password123",
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

  describe('Create Post', () => {
    it('should create a post with content and intent successfully (no image)', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .send({
          content: "This is a new test post",
          intent: "discuss"
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.post).toBeDefined();
      expect(res.body.post.content).toBe("This is a new test post");
      expect(res.body.post.intent).toBe("discuss");
      expect(res.body.post.image).toBeNull();
    });

    it('should create a post with content, intent, and image upload successfully', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .field('content', 'Post with image content')
        .field('intent', 'share')
        .attach('image', Buffer.from('dummy image data'), 'image.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.post).toBeDefined();
      expect(res.body.post.content).toBe("Post with image content");
      expect(res.body.post.image).toBe('https://res.cloudinary.com/dummy-cloud/image/upload/v12345/posts/dummy_image.png');
      expect(res.body.post.imagePublicId).toBe('posts/dummy_image_public_id');

      // Verify in DB
      const dbPost = await Post.findById(res.body.post._id);
      expect(dbPost).toBeDefined();
      expect(dbPost.image).toBe('https://res.cloudinary.com/dummy-cloud/image/upload/v12345/posts/dummy_image.png');
    });

    it('should create a post with only an image upload and intent successfully', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .field('intent', 'build')
        .attach('image', Buffer.from('dummy image data 2'), 'build.png');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.post.content).toBe("");
      expect(res.body.post.image).toBeDefined();
    });

    it('should return 400 if intent is invalid', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .send({
          content: "Some content",
          intent: "invalid_intent"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid intent');
    });

    it('should return success: false if both content and image are missing', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .send({
          intent: "ask"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('either content or image are required');
    });

    it('should rollback Cloudinary upload if Post.create fails', async () => {
      const createSpy = jest.spyOn(Post, 'create').mockRejectedValueOnce(new Error('Forced DB Error'));
      mockDestroy.mockClear();

      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .field('intent', 'share')
        .field('content', 'This post will fail to save')
        .attach('image', Buffer.from('dummy data'), 'fail.png');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Forced DB Error');
      
      expect(createSpy).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalledWith('posts/dummy_image_public_id');

      createSpy.mockRestore();
    });
  });

  describe('Edit Post', () => {
    it('should update post content and intent successfully', async () => {
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Cookie', cookie)
        .send({
          content: "Updated Content",
          intent: "reflect"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.content).toBe("Updated Content");
      expect(res.body.post.intent).toBe("reflect");
    });

    it('should update post with new image upload successfully', async () => {
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Cookie', cookie)
        .field('content', 'Updated content with image')
        .field('intent', 'share')
        .attach('image', Buffer.from('new dummy image data'), 'new_image.png');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.image).toBe('https://res.cloudinary.com/dummy-cloud/image/upload/v12345/posts/dummy_image.png');
      expect(res.body.post.imagePublicId).toBe('posts/dummy_image_public_id');
    });

    it('should remove image from post when removeImage is true', async () => {
      // Set an initial image on the post
      post.image = 'https://some-cloudinary-url.com/image.png';
      post.imagePublicId = 'some-public-id';
      await post.save();

      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Cookie', cookie)
        .send({
          content: "Keep this content but remove image",
          intent: "discuss",
          removeImage: "true"
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.post.image).toBeNull();
      expect(res.body.post.imagePublicId).toBeNull();
    });

    it('should return 403 if a user tries to edit someone else\'s post', async () => {
      // Create and login another user
      const otherUser = {
        name: "Other",
        surname: "Tester",
        phoneNumber: "1112223333",
        email: "other@test.com",
        password: "Password123",
        username: "othertester",
        bio: "Bio",
        description: "Desc"
      };
      await request(app).post('/api/auth/register').send(otherUser);
      const otherLoginRes = await request(app).post('/api/auth/login').send({
        username: otherUser.username,
        password: otherUser.password
      });
      const otherCookie = otherLoginRes.headers['set-cookie'];

      // Attempt to edit post using otherCookie
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Cookie', otherCookie)
        .send({
          content: "Hijacked edit",
          intent: "share"
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not allowed to edit this post');
    });

    it('should return 400 if post ID format is invalid', async () => {
      const res = await request(app)
        .put('/api/posts/invalid-id-format')
        .set('Cookie', cookie)
        .send({
          content: "Valid content",
          intent: "share"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid post ID format');
    });

    it('should return 404 if post does not exist', async () => {
      const nonExistentId = '60c72b2f9b1d8e1f88ef8b5a'; // Valid ObjectId format but non-existent
      const res = await request(app)
        .put(`/api/posts/${nonExistentId}`)
        .set('Cookie', cookie)
        .send({
          content: "Valid content",
          intent: "share"
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Post not found');
    });

    it('should return 400 if content exceeds 1000 characters', async () => {
      const longContent = 'a'.repeat(1001);
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Cookie', cookie)
        .send({
          content: longContent,
          intent: "share"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Content must be 1000 characters or less');
    });

    it('should return 400 if updating both content and image to be empty', async () => {
      const res = await request(app)
        .put(`/api/posts/${post._id}`)
        .set('Cookie', cookie)
        .send({
          content: "",
          intent: "share",
          removeImage: "true"
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Either content or image is required');
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

    it('should delete the related comment notification when deleting a comment', async () => {
      const commenterData = {
        name: "Comment",
        surname: "Author",
        phoneNumber: "2223334444",
        email: "commenter@test.com",
        password: "Password123",
        username: "commentauthor",
        bio: "Bio",
        description: "Desc"
      };

      await request(app).post('/api/auth/register').send(commenterData);
      const commenterLoginRes = await request(app).post('/api/auth/login').send({
        username: commenterData.username,
        password: commenterData.password
      });
      expect(commenterLoginRes.status).toBe(200);
      const commenter = await User.findOne({ username: commenterData.username });
      expect(commenter).not.toBeNull();
      const commenterCookie = commenterLoginRes.headers['set-cookie'];
      const comment = await Comment.create({
        post: post._id,
        author: commenter._id,
        content: "This comment creates a notification"
      });
      await Post.findByIdAndUpdate(post._id, { $inc: { commentsCount: 1 } });

      const notification = await Notification.create({
        recipient: user._id,
        sender: commenter._id,
        type: "comment",
        post: post._id,
        comment: comment._id,
      });

      const deleteRes = await request(app)
        .delete(`/api/comments/delete/${comment._id}`)
        .set('Cookie', commenterCookie);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.success).toBe(true);
      expect(await Comment.findById(comment._id)).toBeNull();
      expect(await Notification.findById(notification._id)).toBeNull();

      const postAfterDelete = await Post.findById(post._id);
      expect(postAfterDelete.commentsCount).toBe(0);
    });
  });
});
