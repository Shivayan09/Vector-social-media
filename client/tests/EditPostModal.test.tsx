import React from "react";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import EditPostModal from "../components/modals/EditPostModal";
import { toast } from "react-toastify";
import type { Post } from "@/lib/types";
import "@testing-library/jest-dom/vitest";

// Mock dependencies
vi.mock("axios");

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: React.ComponentPropsWithoutRef<"img"> & { unoptimized?: boolean }) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { unoptimized, ...rest } = props;
    // eslint-disable-next-line jsx-a11y/alt-text
    return <img {...rest} />;
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const mockPost: Post = {
  _id: "post-123",
  author: {
    _id: "author-123",
    id: "author-123",
    name: "John Doe",
    username: "johndoe",
    avatar: "http://example.com/avatar.jpg",
  },
  content: "Original post content text.",
  intent: "share",
  image: "http://example.com/original-image.jpg",
  likes: [],
  createdAt: "2026-05-19T00:00:00.000Z",
};

describe("EditPostModal Component", () => {
  let mockOnClose: () => void;
  let mockOnPostUpdated: (post: Post) => void;
  const mockBlobUrl = "blob:http://localhost/test-blob-url";

  beforeEach(() => {
    mockOnClose = vi.fn();
    mockOnPostUpdated = vi.fn();
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:5000";

    // Mock global URL methods for image uploads
    global.URL.createObjectURL = vi.fn(() => mockBlobUrl);
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    cleanup();
  });

  describe("Initial Rendering", () => {
    it("renders with post details, pre-selected intent, and image preview", () => {
      render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      // Verify header and textarea content
      expect(screen.getByText("Edit Post")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/What's on your mind?/i)).toHaveValue(
        "Original post content text."
      );

      // Verify selected intent button (Share) has the active styling class
      const shareButton = screen.getByRole("button", { name: "Share" });
      expect(shareButton).toBeInTheDocument();
      expect(shareButton.className).toContain("bg-primary");

      // Verify other intents are not active
      const askButton = screen.getByRole("button", { name: "Ask" });
      expect(askButton.className).not.toContain("bg-primary");

      // Verify image preview is rendered with the original URL
      const previewImg = screen.getByAltText("Preview");
      expect(previewImg).toBeInTheDocument();
      expect(previewImg).toHaveAttribute("src", "http://example.com/original-image.jpg");
    });
  });

  describe("Image Removal Flow", () => {
    it("removes the image preview and updates formData to removeImage: 'true' on submit", async () => {
      vi.mocked(axios.put).mockResolvedValueOnce({
        data: {
          success: true,
          post: { ...mockPost, image: undefined },
        },
      });

      const { container } = render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      // Find and click the trash/remove button (located inside the relative group)
      const removeButton = container.querySelector("button.bg-red-500\\/90");
      expect(removeButton).toBeInTheDocument();
      await userEvent.click(removeButton!);

      // Verify preview image is removed from the DOM
      expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();

      // Click update button to submit
      const updateButton = screen.getByRole("button", { name: /update/i });
      await userEvent.click(updateButton);

      // Assert axios request was sent with the correct payload
      await waitFor(() => {
        expect(axios.put).toHaveBeenCalledWith(
          "http://localhost:5000/api/posts/post-123",
          expect.any(FormData),
          expect.objectContaining({
            headers: { "Content-Type": "multipart/form-data" },
            withCredentials: true,
          })
        );
      });
      const formData = vi.mocked(axios.put).mock.calls[0][1] as FormData;

      expect(formData.get("removeImage")).toBe("true");
      expect(formData.get("content")).toBe("Original post content text.");
      expect(formData.get("intent")).toBe("share");
      expect(formData.get("image")).toBeNull();
    });
  });

  describe("Image Replacement Flow", () => {
    it("updates the preview to new image and appends it to formData on submit", async () => {
      vi.mocked(axios.put).mockResolvedValueOnce({
        data: {
          success: true,
          post: { ...mockPost, image: "http://example.com/new-image.jpg" },
        },
      });

      const { container } = render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      // Find the hidden file input
      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();

      // Create a dummy image file
      const newFile = new File(["dummy png content"], "new-image.png", {
        type: "image/png",
      });

      // Upload file
      await userEvent.upload(fileInput, newFile);

      // Verify that URL.createObjectURL was called and preview src changed
      expect(global.URL.createObjectURL).toHaveBeenCalledWith(newFile);
      const previewImg = screen.getByAltText("Preview");
      expect(previewImg).toHaveAttribute("src", mockBlobUrl);

      // Submit changes
      const updateButton = screen.getByRole("button", { name: /update/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(axios.put).toHaveBeenCalled();
      });

      const formData = vi.mocked(axios.put).mock.calls[0][1] as FormData;
      expect(formData.get("removeImage")).toBe("false");
      expect(formData.get("image")).toEqual(newFile);
      expect(formData.get("content")).toBe("Original post content text.");
    });

    it("revokes old object URL when replacing a blob preview multiple times", async () => {
      const { container } = render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file1 = new File(["img1"], "img1.png", { type: "image/png" });
      const file2 = new File(["img2"], "img2.png", { type: "image/png" });

      // First upload: creates mockBlobUrl
      await userEvent.upload(fileInput, file1);
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);

      // Second upload: should revoke the previous mockBlobUrl
      await userEvent.upload(fileInput, file2);
      expect(global.URL.createObjectURL).toHaveBeenCalledTimes(2);
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
    });
  });

  describe("API Integration and Callbacks", () => {
    it("invokes onPostUpdated, toast, and onClose with delay on successful edit", async () => {
      const updatedPost = { ...mockPost, content: "Newly updated content!" };
      vi.mocked(axios.put).mockResolvedValueOnce({
        data: {
          success: true,
          post: updatedPost,
        },
      });

      render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      const updateButton = screen.getByRole("button", { name: /update/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(mockOnPostUpdated).toHaveBeenCalledWith(updatedPost);
      });

      expect(toast.success).toHaveBeenCalledWith("Post updated successfully!");

      // Wait for the 200ms close delay
      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it("displays error toast and does not call onPostUpdated when API fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.mocked(axios.put).mockRejectedValueOnce(new Error("API failure"));

      render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      const updateButton = screen.getByRole("button", { name: /update/i });
      await userEvent.click(updateButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("Something went wrong");
      });

      expect(mockOnPostUpdated).not.toHaveBeenCalled();
      expect(mockOnClose).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe("Blob Revocation on Unmount", () => {
    it("revokes object URL when the component unmounts with a blob URL preview", async () => {
      const { container, unmount } = render(
        <EditPostModal
          post={mockPost}
          onClose={mockOnClose}
          onPostUpdated={mockOnPostUpdated}
        />
      );

      const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["content"], "test.png", { type: "image/png" });

      // Upload triggers createObjectURL
      await userEvent.upload(fileInput, file);
      expect(screen.getByAltText("Preview")).toHaveAttribute("src", mockBlobUrl);

      // Unmount component
      unmount();

      // Should clean up / revoke blob URL
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith(mockBlobUrl);
    });
  });
});
