import mongoose from "mongoose";
import Post from "../src/models/post.model.js";
import User from "../src/models/user.model.js";
import request from "supertest";
import app from "../src/app.js";

describe("Post Cursor-Based Pagination", () => {
  let testUserId;
  let testUser;
  let postIds = [];

  beforeEach(async () => {
    // Create fresh test user for each test
    testUser = await User.create({
      username: "paginationuser",
      email: "pagination@test.com",
      password: "hashedpassword123",
      name: "Test Pagination User",
    });
    testUserId = testUser._id;

    // Create 15 test posts for pagination testing
    postIds = [];
    for (let i = 0; i < 15; i++) {
      const post = await Post.create({
        author: testUserId,
        content: `Test post ${i}`,
        intent: "share",
        likes: [],
      });
      postIds.push(post._id);
    }

    // Sort by creation order (newest first) to match query behavior
    postIds = postIds.reverse();
  });

  describe("GET /api/posts/user/:userId", () => {
    test("First page returns correct number of posts", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5 });

      expect(response.status).toBe(200);
      expect(response.body.posts).toBeDefined();
      expect(response.body.posts.length).toBe(5);
      expect(response.body.hasMore).toBe(true);
      expect(response.body.nextCursor).toBeDefined();
      expect(response.body.limit).toBe(5);
    });

    test("First page response contains valid cursor for pagination", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5 });

      expect(response.body.nextCursor).toBeTruthy();
      expect(mongoose.Types.ObjectId.isValid(response.body.nextCursor)).toBe(true);
    });

    test("Second page uses cursor correctly", async () => {
      // Get first page
      const firstPageResponse = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5 });

      const firstPagePostIds = firstPageResponse.body.posts.map((p) => p._id.toString());
      const cursor = firstPageResponse.body.nextCursor;

      // Get second page
      const secondPageResponse = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5, cursor });

      const secondPagePostIds = secondPageResponse.body.posts.map((p) => p._id.toString());

      // Ensure no overlap between pages
      const overlap = firstPagePostIds.filter((id) => secondPagePostIds.includes(id));
      expect(overlap.length).toBe(0);

      // Ensure posts on second page are different
      expect(secondPagePostIds.length).toBeGreaterThan(0);
    });

    test("Final page sets hasMore to false", async () => {
      // Get first page
      const firstPageResponse = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 10 });

      let cursor = firstPageResponse.body.nextCursor;
      let hasMore = firstPageResponse.body.hasMore;

      // Keep fetching until hasMore is false
      while (hasMore) {
        const response = await request(app)
          .get(`/api/posts/user/${testUserId}`)
          .query({ limit: 10, cursor });

        if (response.body.hasMore) {
          cursor = response.body.nextCursor;
          hasMore = response.body.hasMore;
        } else {
          hasMore = false;
          expect(response.body.hasMore).toBe(false);
          expect(response.body.nextCursor).toBeNull();
        }
      }
    });

    test("Invalid cursor returns 400 error", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5, cursor: "invalid-cursor" });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid cursor");
    });

    test("Pagination with default limit (10)", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`);

      expect(response.status).toBe(200);
      expect(response.body.posts.length).toBeLessThanOrEqual(10);
      expect(response.body.limit).toBe(10);
    });

    test("Limit is bounded by MAX_LIMIT (50)", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 1000 });

      expect(response.body.limit).toBeLessThanOrEqual(50);
    });

    test("Likes are returned with proper structure", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5 });

      expect(response.body.posts.length).toBeGreaterThan(0);

      const post = response.body.posts[0];
      expect(post.likes).toBeDefined();
      expect(Array.isArray(post.likes)).toBe(true);
      expect(post.likesCount).toBeDefined();
      expect(typeof post.likesCount).toBe("number");
    });

    test("Post metadata includes bookmarked status", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 5 });

      expect(response.body.posts.length).toBeGreaterThan(0);

      const post = response.body.posts[0];
      expect(post.isBookmarked).toBeDefined();
      expect(typeof post.isBookmarked).toBe("boolean");
    });

    test("Posts are sorted by creation date (newest first)", async () => {
      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 15 });

      expect(response.body.posts.length).toBeGreaterThan(1);

      for (let i = 0; i < response.body.posts.length - 1; i++) {
        const currentPostDate = new Date(response.body.posts[i].createdAt);
        const nextPostDate = new Date(response.body.posts[i + 1].createdAt);

        // Current post should be newer or same age
        expect(currentPostDate.getTime()).toBeGreaterThanOrEqual(nextPostDate.getTime());
      }
    });
  });

  describe("Post Performance", () => {
    test("Response time for paginated query is reasonable", async () => {
      const startTime = Date.now();

      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 10 });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      // Response should be faster than 5 seconds even with pagination
      expect(responseTime).toBeLessThan(5000);
    });

    test("Response size is bounded regardless of likes count", async () => {
      // Create a post with many likes
      const post = await Post.create({
        author: testUserId,
        content: "Popular post",
        intent: "share",
        likes: [],
      });

      // Add many likes
      const likeCount = 100;
      for (let i = 0; i < likeCount; i++) {
        const likeUser = await User.create({
          username: `liker${i}`,
          email: `liker${i}@test.com`,
          password: "password",
          name: `Liker ${i}`,
        });
        post.likes.push(likeUser._id);
      }
      await post.save();

      const response = await request(app)
        .get(`/api/posts/user/${testUserId}`)
        .query({ limit: 10 });

      expect(response.status).toBe(200);

      // Find our test post in response
      const testPost = response.body.posts.find((p) => p._id === post._id.toString());
      if (testPost) {
        // Should only return preview of likes, not all 100
        expect(testPost.likes.length).toBeLessThanOrEqual(10);
        // But likesCount should show the actual total
        expect(testPost.likesCount).toBe(likeCount);
      }

      // Cleanup
      await Post.deleteOne({ _id: post._id });
      const likeUsers = await User.find({ username: /^liker\d+$/ });
      await User.deleteMany({ _id: { $in: likeUsers.map((u) => u._id) } });
    });
  });
});
