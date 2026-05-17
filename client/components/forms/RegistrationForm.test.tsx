import { render, screen, fireEvent } from "@testing-library/react";
import RegistrationForm from "./RegistrationForm";

describe("RegistrationForm Validation", () => {
  test("checks password mismatch", () => {
    render(<RegistrationForm />);

    fireEvent.change(screen.getByPlaceholderText(/password/i), {
      target: { value: "12345678" },
    });

    fireEvent.change(screen.getByPlaceholderText(/confirm/i), {
      target: { value: "wrong" },
    });

    fireEvent.click(screen.getByRole("button"));

    expect(screen.getByText(/match/i)).toBeInTheDocument();
  });
});
