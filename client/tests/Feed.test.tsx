import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import axios from 'axios';
import Feed from '@/components/feed/Feed';
import { AppContext } from '@/context/AppContext';

// Mock axios globally for this test file
vi.mock('axios');

// Provide a minimal IntersectionObserver mock to trigger pagination
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  observe() {
    // immediately trigger intersection to load next page
    this.callback([{ isIntersecting: true } as IntersectionObserverEntry]);
  }
  disconnect() {}
}
// @ts-ignore – assign to global for the test environment
global.IntersectionObserver = MockIntersectionObserver as any;

// Helper to build a minimal Post object
const buildPost = (id: string, overrides = {}) => ({
  _id: id,
  author: { _id: `author-${id}`, name: 'Test User', username: 'testuser', avatar: '' },
  content: `Post ${id}`,
  intent: '',
  likes: [],
  commentsCount: 0,
  sharesCount: 0,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('Feed component – top weekly posts pinning', () => {
  it('pins top weekly posts, dedupes with regular feed and preserves order after pagination', async () => {
    const topPosts = [buildPost('t1'), buildPost('t2'), buildPost('t3')];
    const feedPosts = [buildPost('t2'), buildPost('f1'), buildPost('f2')];
    const page2Posts = [buildPost('t3'), buildPost('p1')];

    // Mock axios.get responses based on URL
    (axios.get as jest.Mock).mockImplementation((url: string) => {
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
      // fallback for auth/me (not used in this test but prevents unexpected calls)
      return Promise.resolve({ data: { user: null } });
    });

    // Simple provider that supplies mutable posts state
    const TestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
      const [posts, setPosts] = React.useState<any[]>([]);
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
      return <AppContext.Provider value={dummy as any}>{children}</AppContext.Provider>;
    };

    render(
      <TestProvider>
        <Feed />
      </TestProvider>
    );

    // Wait for all posts to be rendered (top + feed + page2, deduped)
    await waitFor(() => {
      const cards = screen.getAllByTestId('post-card');
      expect(cards).toHaveLength(6);
    });

    const cards = screen.getAllByTestId('post-card');
    // Verify the first three cards are the top weekly posts in the original order
    expect(cards[0]).toHaveAttribute('data-post-id', 't1');
    expect(cards[1]).toHaveAttribute('data-post-id', 't2');
    expect(cards[2]).toHaveAttribute('data-post-id', 't3');
    // Ensure no duplicate ids appear later in the list
    const ids = cards.map((c) => c.getAttribute('data-post-id'));
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
