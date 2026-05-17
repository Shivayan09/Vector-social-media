import { render, screen, fireEvent } from "@testing-library/react";
import LoginForm from "./LoginForm";

describe("LoginForm Validation", () => {
  test("shows error when fields are empty", () => {
    render(<LoginForm />);

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });