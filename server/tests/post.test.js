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

jest.unstable_mockModule('../src/socket/socket.js', () => ({
  getIO: () => ({
    to: () => ({
      emit: () => {},
    }),
  }),
}));

// Dynamic imports to ensure mocks are registered
const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { default: User } = await import('../src/models/user.model.js');
const { default: Follow } = await import('../src/models/follow.model.js');
const { default: Post } = await import('../src/models/post.model.js');
const { default: Comment } = await import('../src/models/comment.model.js');
const { default: Notification } = await import('../src/models/notification.model.js');

const validPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

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
        .attach('image', validPng, { filename: 'image.png', contentType: 'image/png' });

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
        .attach('image', validPng, { filename: 'build.png', contentType: 'image/png' });

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
        .attach('image', validPng, { filename: 'fail.png', contentType: 'image/png' });

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Forced DB Error');
      
      expect(createSpy).toHaveBeenCalled();
      expect(mockDestroy).toHaveBeenCalledWith('posts/dummy_image_public_id');

      createSpy.mockRestore();
    });

    it('should reject a non-image MIME type before upload', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .field('intent', 'share')
        .field('content', 'Invalid MIME upload')
        .attach('image', Buffer.from('not an image'), { filename: 'payload.txt', contentType: 'text/plain' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only JPEG, PNG, GIF, WebP, and AVIF images are allowed');
    });

    it('should reject a spoofed image extension with invalid file content', async () => {
      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .field('intent', 'share')
        .field('content', 'Spoofed image upload')
        .attach('image', Buffer.from('not really a png'), { filename: 'spoof.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Only valid JPEG, PNG, GIF, WEBP, AVIF images are allowed');
    });

    it('should reject oversized post images at the controller boundary', async () => {
      const oversizedPng = Buffer.concat([
        validPng,
        Buffer.alloc((2 * 1024 * 1024) + 1),
      ]);

      const res = await request(app)
        .post('/api/posts')
        .set('Cookie', cookie)
        .field('intent', 'share')
        .field('content', 'Oversized upload')
        .attach('image', oversizedPng, { filename: 'large.png', contentType: 'image/png' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Post image must be 2MB or smaller');
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
        .attach('image', validPng, { filename: 'new_image.png', contentType: 'image/png' });

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

  describe('Bookmark Toggle', () => {
    it('should bookmark and then unbookmark a post', async () => {
      // Bookmark
      const bookmarkRes = await request(app)
        .post(`/api/posts/${post._id}/bookmark`)
        .set('Cookie', cookie);

      expect(bookmarkRes.status).toBe(200);
      expect(bookmarkRes.body.success).toBe(true);
      expect(bookmarkRes.body.bookmarked).toBe(true);
      expect(bookmarkRes.body.message).toBe("Added to bookmarks");

      // Verify in user bookmarks
      let updatedUser = await User.findById(user._id);
      expect(updatedUser.bookmarks.map(String)).toContain(post._id.toString());

      // Unbookmark
      const unbookmarkRes = await request(app)
        .post(`/api/posts/${post._id}/bookmark`)
        .set('Cookie', cookie);

      expect(unbookmarkRes.status).toBe(200);
      expect(unbookmarkRes.body.success).toBe(true);
      expect(unbookmarkRes.body.bookmarked).toBe(false);
      expect(unbookmarkRes.body.message).toBe("Removed from bookmarks");

      // Verify in user bookmarks
      updatedUser = await User.findById(user._id);
      expect(updatedUser.bookmarks.map(String)).not.toContain(post._id.toString());
    });

    it('should handle concurrent bookmark requests without losing updates', async () => {
      // Create another post
      const post2 = await Post.create({
        author: user._id,
        content: "Second Post Content",
        intent: "share"
      });

      // Send concurrent requests to bookmark post and post2
      const [res1, res2] = await Promise.all([
        request(app)
          .post(`/api/posts/${post._id}/bookmark`)
          .set('Cookie', cookie),
        request(app)
          .post(`/api/posts/${post2._id}/bookmark`)
          .set('Cookie', cookie)
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      // Verify that BOTH posts are in the bookmarks array
      const updatedUser = await User.findById(user._id);
      const bookmarksStr = updatedUser.bookmarks.map(String);
      expect(bookmarksStr).toContain(post._id.toString());
      expect(bookmarksStr).toContain(post2._id.toString());
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

    it('should block non-followers from commenting on a private user post', async () => {
      const privateUserData = {
        name: "Private",
        surname: "Author",
        phoneNumber: "3334445555",
        email: "privateauthor@test.com",
        password: "Password123",
        username: "privateauthor",
        bio: "Bio",
        description: "Desc",
        isPrivate: true
      };
      const outsiderData = {
        name: "Outside",
        surname: "User",
        phoneNumber: "4445556666",
        email: "outsider@test.com",
        password: "Password123",
        username: "outsideruser",
        bio: "Bio",
        description: "Desc"
      };

      await request(app).post('/api/auth/register').send(privateUserData);
      await request(app).post('/api/auth/register').send(outsiderData);

      const outsiderLoginRes = await request(app).post('/api/auth/login').send({
        username: outsiderData.username,
        password: outsiderData.password
      });
      const outsiderCookie = outsiderLoginRes.headers['set-cookie'];

      const privateUser = await User.findOne({ username: privateUserData.username });
      const privatePost = await Post.create({
        author: privateUser._id,
        content: "Private post",
        intent: "share"
      });

      const commentRes = await request(app)
        .post(`/api/comments/${privatePost._id}`)
        .set('Cookie', outsiderCookie)
        .send({ content: "I should not be able to comment" });

      expect(commentRes.status).toBe(403);
      expect(commentRes.body.message).toContain('Follow them to comment');
      expect(await Comment.countDocuments({ post: privatePost._id })).toBe(0);
      expect(await Notification.countDocuments({ recipient: privateUser._id, type: 'comment', post: privatePost._id })).toBe(0);

      // Also verify that a follower CAN comment
      const outsider = await User.findOne({ username: outsiderData.username });
      await Follow.create({ follower: outsider._id, following: privateUser._id, status: 'accepted' });

      const followerCommentRes = await request(app)
        .post(`/api/comments/${privatePost._id}`)
        .set('Cookie', outsiderCookie)
        .send({ content: "I follow this account" });

      expect(followerCommentRes.status).toBe(201);
    });
  });

  describe('Search Posts', () => {
    beforeAll(async () => {
      await Post.createIndexes(); // Ensure text index is built
    });

    it('should return relevant posts for query', async () => {
      await Post.create({
        author: user._id,
        content: "Unique search keyword",
        intent: "share"
      });

      const res = await request(app)
        .get('/api/posts/search?q=Unique')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
      expect(res.body.posts.length).toBeGreaterThan(0);
      expect(res.body.posts[0].content).toContain('Unique');
    });

    it('should return empty posts if no query is provided', async () => {
      const res = await request(app)
        .get('/api/posts/search')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.posts).toEqual([]);
    });
  });

  describe('Delete Post', () => {
    it('should delete a post successfully and call cloudinary destroy', async () => {
      const newPost = await Post.create({
        author: user._id,
        content: "Delete test content",
        intent: "share",
        image: "https://res.cloudinary.com/dummy-cloud/image/upload/v12345/posts/dummy_image.png",
        imagePublicId: "posts/dummy_image_public_id"
      });

      mockDestroy.mockClear();
      mockDestroy.mockResolvedValue({ result: 'ok' });

      const res = await request(app)
        .delete(`/api/posts/${newPost._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');
      
      const dbPost = await Post.findById(newPost._id);
      expect(dbPost).toBeNull();
      
      expect(mockDestroy).toHaveBeenCalledWith('posts/dummy_image_public_id');
    });

    it('should delete a post successfully even when cloudinary destroy fails', async () => {
      const newPost = await Post.create({
        author: user._id,
        content: "Delete test content with failing cloudinary",
        intent: "share",
        image: "https://res.cloudinary.com/dummy-cloud/image/upload/v12345/posts/dummy_image.png",
        imagePublicId: "posts/dummy_image_public_id"
      });

      mockDestroy.mockClear();
      mockDestroy.mockRejectedValue(new Error('Cloudinary destroy failure'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const res = await request(app)
        .delete(`/api/posts/${newPost._id}`)
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');

      const dbPost = await Post.findById(newPost._id);
      expect(dbPost).toBeNull();

      expect(mockDestroy).toHaveBeenCalledWith('posts/dummy_image_public_id');

      consoleErrorSpy.mockRestore();
    });
  });
});

