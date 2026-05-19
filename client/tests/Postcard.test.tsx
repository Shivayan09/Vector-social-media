import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";
import type { ComponentProps } from "react";
import PostCard from "../components/feed/Postcard";
import type { Post } from "@/lib/types";

afterEach(() => {
  cleanup();
});

// Mock axios
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

// Mock AppContext
vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    userData: { id: "user123" },
    setPosts: vi.fn(),
  }),
}));

// Mock next/image to render a standard img tag with passed props,
// allowing us to easily simulate onLoad and onError events.
vi.mock("next/image", () => ({
  default: (props: ComponentProps<"img">) => {
    return <img alt="" {...props} />;
  },
}));

// Mock react-toastify
vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("PostCard Image Loading Behavior", () => {
  const mockPost: Post = {
    _id: "post_123",
    author: {
      _id: "user123",
      id: "user123",
      name: "Test User",
      username: "testuser",
      avatar: "http://example.com/avatar.jpg",
    },
    content: "Check out this image!",
    image: "http://example.com/post-image.jpg",
    intent: "discuss",
    likes: [],
    commentsCount: 2,
    sharesCount: 1,
    createdAt: new Date().toISOString(),
  };

  it("should show skeleton loader initially while image is loading", () => {
    render(<PostCard post={mockPost} />);

    // The skeleton loader should be visible (aria-label="Loading content")
    const skeleton = screen.getByLabelText("Loading content");
    expect(skeleton).toBeInTheDocument();

    // The image should be rendered but invisible/hidden (opacity-0)
    const image = screen.getByAltText("Post attachment");
    expect(image).toBeInTheDocument();
    expect(image).toHaveClass("opacity-0");

    // The failed fallback UI should not be visible
    expect(screen.queryByText("Failed to load image")).not.toBeInTheDocument();
  });

  it("should clear skeleton loader and show image when image successfully loads", () => {
    render(<PostCard post={mockPost} />);

    const image = screen.getByAltText("Post attachment");
    
    // Simulate image loading successfully
    fireEvent.load(image);

    // The skeleton loader should be removed
    expect(screen.queryByLabelText("Loading content")).not.toBeInTheDocument();

    // The image should have opacity-100 now
    expect(image).toHaveClass("opacity-100");

    // Failed UI should not be present
    expect(screen.queryByText("Failed to load image")).not.toBeInTheDocument();
  });

  it("should clear skeleton loader and show fallback UI when image fails to load", () => {
    render(<PostCard post={mockPost} />);

    const image = screen.getByAltText("Post attachment");

    // Simulate image failing to load
    fireEvent.error(image);

    // The skeleton loader should be removed
    expect(screen.queryByLabelText("Loading content")).not.toBeInTheDocument();

    // The image should be unmounted/removed from DOM
    expect(screen.queryByAltText("Post attachment")).not.toBeInTheDocument();

    // Failed UI fallback should be visible
    expect(screen.getByText("Failed to load image")).toBeInTheDocument();
  });

  describe("Timeout Fallback Behavior", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should fallback to failure state when image load stalls and times out (8 seconds)", () => {
      render(<PostCard post={mockPost} />);

      // Initially skeleton is shown
      expect(screen.getByLabelText("Loading content")).toBeInTheDocument();
      expect(screen.queryByText("Failed to load image")).not.toBeInTheDocument();

      // Fast-forward time by 8 seconds (8000ms)
      act(() => {
        vi.advanceTimersByTime(8000);
      });

      // Skeleton should be removed after timeout triggers
      expect(screen.queryByLabelText("Loading content")).not.toBeInTheDocument();

      // Fallback UI should be shown
      expect(screen.getByText("Failed to load image")).toBeInTheDocument();
    });
  });
});
