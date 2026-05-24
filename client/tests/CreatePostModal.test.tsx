import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import CreatePostModal from "../components/modals/CreatePostModal";
import { toast } from "react-toastify";
import axios from "axios";
import "@testing-library/jest-dom/vitest";

import type { ComponentPropsWithoutRef } from "react";

vi.mock("axios");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    error: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: ComponentPropsWithoutRef<"img"> & { unoptimized?: boolean }) => {
    const cleanedProps = { ...props };
    delete cleanedProps.unoptimized;
    return <img alt="" {...cleanedProps} />;
  },
}));

describe("CreatePostModal Image Validation And Preview", () => {
  const mockOnClose = vi.fn();
  const mockOnPostCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "mock-image-url"),
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("renders the modal and main fields", () => {
    render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    expect(screen.getByText("Create New Post")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/What's on your mind\?/i)
    ).toBeInTheDocument();
    expect(screen.getByText("Drop your photos here")).toBeInTheDocument();
  });

  it("rejects non-image files and triggers toast error", async () => {
    const { container } = render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    const nonImageFile = new File(["dummy text"], "test.txt", {
      type: "text/plain",
    });

    fireEvent.change(fileInput, {
      target: { files: [nonImageFile] },
    });

    expect(toast.error).toHaveBeenCalledWith("Only image files are allowed");
    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
  });

  it("rejects image files larger than 2MB and triggers toast error", async () => {
    const { container } = render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // 2MB + 1 byte
    const oversizedFile = new File(
      ["a".repeat(2 * 1024 * 1024 + 1)],
      "large.png",
      {
        type: "image/png",
      }
    );

    await userEvent.upload(fileInput, oversizedFile);

    expect(toast.error).toHaveBeenCalledWith("File size must be less than 2MB");
    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
  });

  it("accepts an image of exactly 2MB size", async () => {
    const { container } = render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const fileExactly2MB = new File(
      ["a".repeat(2 * 1024 * 1024)],
      "exact.png",
      { type: "image/png" }
    );

    await userEvent.upload(fileInput, fileExactly2MB);

    expect(toast.error).not.toHaveBeenCalled();
    const previewImg = screen.getByAltText("Preview");
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute("src", "mock-image-url");
  });

  it("accepts valid image file (<2MB) and shows image preview", async () => {
    const { container } = render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const validFile = new File(["valid image content"], "valid.png", {
      type: "image/png",
    });

    await userEvent.upload(fileInput, validFile);

    expect(URL.createObjectURL).toHaveBeenCalledWith(validFile);
    
    const previewImg = screen.getByAltText("Preview");
    expect(previewImg).toBeInTheDocument();
    expect(previewImg).toHaveAttribute("src", "mock-image-url");
  });

  it("removes the image preview when trash button is clicked", async () => {
    const { container } = render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    const validFile = new File(["valid image content"], "valid.png", {
      type: "image/png",
    });

    await userEvent.upload(fileInput, validFile);

    expect(screen.getByAltText("Preview")).toBeInTheDocument();

    const trashButton = container.querySelector("button.bg-red-500\\/90") as HTMLButtonElement;
    expect(trashButton).toBeInTheDocument();

    await userEvent.click(trashButton);

    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
    expect(screen.getByText("Drop your photos here")).toBeInTheDocument();
  });

  it("rejects multiple files on drop and shows warning toast", () => {
    render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const dropZone = screen.getByRole("button", { name: /drop your photos here/i });

    const file1 = new File(["content1"], "image1.png", { type: "image/png" });
    const file2 = new File(["content2"], "image2.png", { type: "image/png" });

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file1, file2],
      },
    });

    expect(toast.warning).toHaveBeenCalledWith("Please drop only one image file");
    expect(screen.queryByAltText("Preview")).not.toBeInTheDocument();
  });

  it("closes the modal when Cancel is clicked", async () => {
    render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await userEvent.click(cancelButton);

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });

  it("submits the post successfully with valid inputs", async () => {
    vi.mocked(axios.post).mockResolvedValueOnce({
      data: {
        success: true,
        post: { id: "1", content: "Test post content", intent: "ask" },
      },
    });

    const { container } = render(
      <CreatePostModal
        onClose={mockOnClose}
        onPostCreated={mockOnPostCreated}
      />
    );

    // Select intent
    const askIntentButton = screen.getByRole("button", { name: "Ask" });
    await userEvent.click(askIntentButton);

    // Enter content
    const textarea = screen.getByPlaceholderText(/What's on your mind\?/i);
    await userEvent.type(textarea, "Test post content");

    // Upload a valid file
    const fileInput = container.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;
    const validFile = new File(["valid image content"], "valid.png", {
      type: "image/png",
    });
    await userEvent.upload(fileInput, validFile);

    // Click Publish
    const publishButton = screen.getByRole("button", { name: /publish/i });
    await userEvent.click(publishButton);

    // Assert Axios post arguments
    expect(axios.post).toHaveBeenCalled();
    const [url, formData] = vi.mocked(axios.post).mock.calls[0];
    expect(url).toContain("/api/posts");
    expect(formData).toBeInstanceOf(FormData);
    expect((formData as FormData).get("content")).toBe("Test post content");
    expect((formData as FormData).get("intent")).toBe("ask");
    expect((formData as FormData).get("image")).toEqual(validFile);

    expect(toast.success).toHaveBeenCalledWith("Posted!");
    expect(mockOnPostCreated).toHaveBeenCalledWith({
      id: "1",
      content: "Test post content",
      intent: "ask",
    });

    await waitFor(() => expect(mockOnClose).toHaveBeenCalled());
  });
});
