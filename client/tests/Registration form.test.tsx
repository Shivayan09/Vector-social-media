import { render, screen, fireEvent } from "@testing-library/react";
import RegistrationForm from "../components/forms/RegistrationForm";

describe("RegistrationForm", () => {
  test("renders all input fields", () => {
    render(<RegistrationForm />);

    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
  });

  test("validates password mismatch", () => {
    render(<RegistrationForm />);

    const password = screen.getByPlaceholderText(/password/i);
    const confirm = screen.getByPlaceholderText(/confirm/i);
    const button = screen.getByRole("button");

    fireEvent.change(password, { target: { value: "123456" } });
    fireEvent.change(confirm, { target: { value: "999999" } });

    fireEvent.click(button);

    expect(screen.getByText(/match|not same|invalid/i)).toBeInTheDocument();
  });
});