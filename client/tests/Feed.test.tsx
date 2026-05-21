import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import axios from 'axios';
import Feed from '@/components/feed/Feed';
import { AppContext } from '@/context/AppContext';
import type { Post } from '@/lib/types';

// Mock axios globally for this test file using Vitest's mock system
vi.mock('axios');

// Mock PostList component to capture the `posts` prop passed by Feed
let capturedPosts: Post[] = [];
vi.mock('@/components/feed/PostList', () => ({
  __esModule: true,
  default: (props: { posts: Post[] }) => {
    capturedPosts = props.posts;
    return null; // No UI rendering needed for the test
  },
}));

// Manual IntersectionObserver mock – we control when it fires
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  static instance: MockIntersectionObserver | null = null;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instance = this;
  }
  observe() {}
  disconnect() {}
  static trigger() {
    if (MockIntersectionObserver.instance) {
      MockIntersectionObserver.instance.callback([
        { isIntersecting: true } as IntersectionObserverEntry,
      ], MockIntersectionObserver.instance as unknown as IntersectionObserver);
    }
  }
}
global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Helper to build a minimal Post object with optional overrides
const buildPost = (id: string, overrides: Partial<Post> = {}): Post => ({
  _id: id,
  author: { _id: `author-${id}`, id: `author-${id}`, name: 'Test User', username: 'testuser', avatar: '' },
  content: `Post ${id}`,
  intent: 'share',
  likes: [],
  commentsCount: 0,
  sharesCount: 0,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Feed component – top weekly posts pinning', () => {
  it('renders top weekly posts first, dedupes duplicates, and keeps order after pagination', async () => {
    const topPosts = [buildPost('t1'), buildPost('t2'), buildPost('t3')];
    const feedPosts = [buildPost('t2'), buildPost('f1'), buildPost('f2')];
    const page2Posts = [buildPost('t3'), buildPost('p1')];

    // Mock axios.get based on request URL
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.includes('/api/posts/top-week')) {
        return Promise.resolve({ data: { posts: topPosts } });
      }
      if (url.includes('/api/posts?')) {
        if (url.includes('page=1')) {
          return Promise.resolve({ data: { posts: feedPosts, hasMore: true } });
        }
        if (url.includes('page=2')) {
          return Promise.resolve({ data: { posts: page2Posts, hasMore: false } });
        }
      }
      // fallback for auth/me – not used in this test
      return Promise.resolve({ data: { user: null } });
    });

    // Minimal AppContext provider needed by Feed
    const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const [posts, setPosts] = React.useState<Post[]>([]);
      const dummy = {
        isLoggedIn: true,
        setIsLoggedIn: () => {},
        userData: null,
        setUserData: () => {},
        isProfileComplete: true,
        posts,
        setPosts,
        loading: false,
        setLoading: () => {},
        refreshAuth: async () => {},
      };
      const contextValue = dummy as unknown as NonNullable<React.ContextType<typeof AppContext>>;
      return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
    };

    render(
      <TestProvider>
        <Feed />
      </TestProvider>,
    );

    // Wait until the initial fetch populates capturedPosts
    await waitFor(() => {
      expect(capturedPosts.length).toBeGreaterThan(0);
    });

    // Verify the first three posts are the top‑weekly ones in order and no duplicates exist yet
    expect(capturedPosts.slice(0, 3).map(p => p._id)).toEqual(['t1', 't2', 't3']);
    expect(new Set(capturedPosts.map(p => p._id)).size).toBe(capturedPosts.length);

    // Trigger pagination (page 2) manually after the first load is finished
    MockIntersectionObserver.trigger();

    // Wait for pagination to complete and posts to update
    await waitFor(() => {
      // 3 top + 2 unique from page 1 + 1 new from page 2 = 6
      expect(capturedPosts.length).toBe(6);
    });

    // Order should still start with the top weekly posts
    expect(capturedPosts.slice(0, 3).map(p => p._id)).toEqual(['t1', 't2', 't3']);
    // The final post should be the new page‑2 post that wasn't a duplicate
    expect(capturedPosts[capturedPosts.length - 1]._id).toBe('p1');
  });
});
