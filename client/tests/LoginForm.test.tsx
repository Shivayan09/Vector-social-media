import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import LoginForm from "../components/forms/LoginForm";

vi.mock("axios");

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

vi.mock("@/context/AppContext", () => ({
  useAppContext: () => ({
    isLoggedIn: false,
    refreshAuth: vi.fn(),
  }),
}));

vi.mock("@react-oauth/google", () => ({
  GoogleLogin: () => <div>Google Login</div>,
}));

describe("LoginForm", () => {
  it("renders login form fields", () => {
    render(<LoginForm />);

    expect(
      screen.getByPlaceholderText(/demousername09/i)
    ).toBeInTheDocument();

    expect(
      screen.getByPlaceholderText(/enter your password/i)
    ).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
  render(<LoginForm />);

  const passwordInputs = screen.getAllByPlaceholderText(
    /enter your password/i
  );

  const passwordInput = passwordInputs[0];

  expect(passwordInput).toHaveAttribute(
    "type",
    "password"
  );

  const toggleIcon =
    passwordInput.parentElement?.querySelector("span");

  await userEvent.click(toggleIcon!);

  expect(passwordInput).toHaveAttribute(
    "type",
    "text"
  );
});
});