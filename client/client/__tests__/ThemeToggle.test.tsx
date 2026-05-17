import { render, screen, fireEvent } from "@testing-library/react";
import ThemeToggle from "../ThemeToggle";

test("ThemeToggle renders correctly", () => {
  render(<ThemeToggle />);

  const button = screen.getByRole("button");
  expect(button).toBeInTheDocument();
});

test("ThemeToggle button can be clicked", () => {
  render(<ThemeToggle />);

  const button = screen.getByRole("button");
  fireEvent.click(button);

  expect(button).toBeInTheDocument();
});