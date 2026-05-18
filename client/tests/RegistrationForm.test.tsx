import { render, screen,cleanup} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach,afterEach } from "vitest";
import RegistrationForm from "../components/forms/RegistrationForm";
import { toast } from "react-toastify";
import "@testing-library/jest-dom/vitest";

vi.mock("axios");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    refreshAuth: vi.fn(),
  }),
}));

vi.mock("react-toastify", () => ({
  toast: {
    warn: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

afterEach(() => {
  cleanup();
});

describe("RegistrationForm Validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows warning when first name is missing", async () => {
    render(<RegistrationForm />);

    const continueButton = screen.getByRole("button", {
      name: /continue/i,
    });

    await userEvent.click(continueButton);

    expect(toast.warn).toHaveBeenCalledWith("Enter first name");
  });

  it("shows warning when password is too short", async () => {
    render(<RegistrationForm />);

    await userEvent.type(
      screen.getByPlaceholderText("demo"),
      "John"
    );

    await userEvent.type(
      screen.getByPlaceholderText("user"),
      "Doe"
    );

    await userEvent.type(
      screen.getByPlaceholderText("demo@gmail.com"),
      "john@gmail.com"
    );

    await userEvent.type(
      screen.getByPlaceholderText("+00 00000 00000"),
      "9999999999"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Enter a password"),
      "123"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Confirm your password"),
      "123"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /continue/i })
    );

    expect(toast.warn).toHaveBeenCalledWith(
      "Password too short"
    );
  });

  it("shows warning when passwords do not match", async () => {
    render(<RegistrationForm />);

    await userEvent.type(
      screen.getByPlaceholderText("demo"),
      "John"
    );

    await userEvent.type(
      screen.getByPlaceholderText("user"),
      "Doe"
    );

    await userEvent.type(
      screen.getByPlaceholderText("demo@gmail.com"),
      "john@gmail.com"
    );

    await userEvent.type(
      screen.getByPlaceholderText("+00 00000 00000"),
      "9999999999"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Enter a password"),
      "123456"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Confirm your password"),
      "abcdef"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /continue/i })
    );

    expect(toast.warn).toHaveBeenCalledWith(
      "Passwords do not match"
    );
  });

  it("moves to step 2 when form is valid", async () => {
    render(<RegistrationForm />);

    await userEvent.type(
      screen.getByPlaceholderText("demo"),
      "John"
    );

    await userEvent.type(
      screen.getByPlaceholderText("user"),
      "Doe"
    );

    await userEvent.type(
      screen.getByPlaceholderText("demo@gmail.com"),
      "john@gmail.com"
    );

    await userEvent.type(
      screen.getByPlaceholderText("+00 00000 00000"),
      "9999999999"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Enter a password"),
      "123456"
    );

    await userEvent.type(
      screen.getByPlaceholderText("Confirm your password"),
      "123456"
    );

    await userEvent.click(
      screen.getByRole("button", { name: /continue/i })
    );

    expect(
      screen.getByText(/set up your profile/i)
    ).toBeInTheDocument();
  });
});