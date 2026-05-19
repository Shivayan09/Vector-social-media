import { render, screen, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import FollowButton from "../components/ui/FollowButton";
import "@testing-library/jest-dom/vitest";

vi.mock("axios");

describe("FollowButton Component", () => {
  const userId = "test-user-id";
  const mockOnFollowChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_BACKEND_URL = "http://localhost:5000";
  });

  afterEach(() => {
    cleanup();
  });

  describe("Initial Rendering", () => {
    it("renders 'Follow' text and blue background when not following/requested", () => {
      render(
        <FollowButton
          userId={userId}
          isFollowing={false}
          isRequested={false}
          onFollowChange={mockOnFollowChange}
        />
      );
      const button = screen.getByRole("button", { name: "Follow" });
      expect(button).toBeInTheDocument();
      expect(button).not.toBeDisabled();
      expect(button.className).toContain("bg-blue-500");
    });

    it("renders 'Following' text and outline styling when following", () => {
      render(
        <FollowButton
          userId={userId}
          isFollowing={true}
          isRequested={false}
          onFollowChange={mockOnFollowChange}
        />
      );
      const button = screen.getByRole("button", { name: "Following" });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain("border-2 bg-black/10");
    });

    it("renders 'Requested' text and outline styling when requested", () => {
      render(
        <FollowButton
          userId={userId}
          isFollowing={false}
          isRequested={true}
          onFollowChange={mockOnFollowChange}
        />
      );
      const button = screen.getByRole("button", { name: "Requested" });
      expect(button).toBeInTheDocument();
      expect(button.className).toContain("border-2 bg-black/10");
    });
  });

  describe("Props Reactivity", () => {
    it("reacts to external updates of isFollowing prop", () => {
      const { rerender } = render(
        <FollowButton userId={userId} isFollowing={false} />
      );
      expect(screen.getByRole("button")).toHaveTextContent("Follow");

      rerender(<FollowButton userId={userId} isFollowing={true} />);
      expect(screen.getByRole("button")).toHaveTextContent("Following");
    });

    it("reacts to external updates of isRequested prop", () => {
      const { rerender } = render(
        <FollowButton userId={userId} isFollowing={false} isRequested={false} />
      );
      expect(screen.getByRole("button")).toHaveTextContent("Follow");

      rerender(<FollowButton userId={userId} isFollowing={false} isRequested={true} />);
      expect(screen.getByRole("button")).toHaveTextContent("Requested");
    });
  });

  describe("State Transitions & API Requests", () => {
    it("handles public account follow flow (Follow -> Following)", async () => {
      let resolvePromise: (value: { data: { followed: boolean } }) => void;
      const responsePromise = new Promise<{ data: { followed: boolean } }>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(axios.put).mockReturnValueOnce(responsePromise);

      render(
        <FollowButton
          userId={userId}
          isFollowing={false}
          onFollowChange={mockOnFollowChange}
        />
      );

      const button = screen.getByRole("button", { name: "Follow" });
      userEvent.click(button);

      // Verify loading state
      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent("...");
      });

      // Now resolve the promise
      resolvePromise({ data: { followed: true } });

      // Verify completed state
      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(button).toHaveTextContent("Following");
      });

      expect(axios.put).toHaveBeenCalledWith(
        "http://localhost:5000/api/users/test-user-id/follow",
        {},
        { withCredentials: true }
      );
      expect(mockOnFollowChange).toHaveBeenCalledWith(true);
    });

    it("handles public account unfollow flow (Following -> Follow)", async () => {
      let resolvePromise: (value: { data: { followed: boolean } }) => void;
      const responsePromise = new Promise<{ data: { followed: boolean } }>((resolve) => {
        resolvePromise = resolve;
      });
      vi.mocked(axios.put).mockReturnValueOnce(responsePromise);

      render(
        <FollowButton
          userId={userId}
          isFollowing={true}
          onFollowChange={mockOnFollowChange}
        />
      );

      const button = screen.getByRole("button", { name: "Following" });
      userEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent("...");
      });

      resolvePromise({ data: { followed: false } });

      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(button).toHaveTextContent("Follow");
      });

      expect(mockOnFollowChange).toHaveBeenCalledWith(false);
    });

    it("handles private account request flow (Follow -> Requested)", async () => {
      vi.mocked(axios.put).mockResolvedValueOnce({
        data: { requested: true },
      });

      render(
        <FollowButton
          userId={userId}
          isFollowing={false}
          isRequested={false}
          onFollowChange={mockOnFollowChange}
        />
      );

      const button = screen.getByRole("button", { name: "Follow" });
      await userEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(button).toHaveTextContent("Requested");
      });

      // Callback should NOT be invoked for follow requests on private accounts
      expect(mockOnFollowChange).not.toHaveBeenCalled();
    });

    it("handles private account cancel request flow (Requested -> Follow)", async () => {
      vi.mocked(axios.put).mockResolvedValueOnce({
        data: { requested: false },
      });

      render(
        <FollowButton
          userId={userId}
          isFollowing={false}
          isRequested={true}
          onFollowChange={mockOnFollowChange}
        />
      );

      const button = screen.getByRole("button", { name: "Requested" });
      await userEvent.click(button);

      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(button).toHaveTextContent("Follow");
      });

      expect(mockOnFollowChange).not.toHaveBeenCalled();
    });
  });

  describe("API Error Resilience", () => {
    it("reverts state to original and logs error if call fails", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      let rejectPromise: (reason?: Error) => void;
      const responsePromise = new Promise((_, reject) => {
        rejectPromise = reject;
      });
      vi.mocked(axios.put).mockReturnValueOnce(responsePromise);

      render(
        <FollowButton
          userId={userId}
          isFollowing={true}
          onFollowChange={mockOnFollowChange}
        />
      );

      const button = screen.getByRole("button", { name: "Following" });
      userEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent("...");
      });

      rejectPromise(new Error("API Error"));

      await waitFor(() => {
        expect(button).not.toBeDisabled();
        expect(button).toHaveTextContent("Following");
      });

      expect(consoleSpy).toHaveBeenCalledWith("API Error");
      expect(mockOnFollowChange).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
