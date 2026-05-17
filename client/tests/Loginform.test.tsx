import { render, screen, fireEvent } from "@testing-library/react";
import LoginForm from "../components/forms/LoginForm";

describe("LoginForm", () => {
  test("renders email and password inputs", () => {
    render(<LoginForm />);

    const emailInput = screen.getByPlaceholderText(/email/i);
    const passwordInput = screen.getByPlaceholderText(/password/i);

    expect(emailInput).toBeInTheDocument();
    expect(passwordInput).toBeInTheDocument();
  });

  test("shows validation when fields are empty and submit is clicked", () => {
    render(<LoginForm />);

    const button = screen.getByRole("button");
    fireEvent.click(button);

    const error = screen.getByText(/required|invalid|email/i);
    expect(error).toBeInTheDocument();
  });
});