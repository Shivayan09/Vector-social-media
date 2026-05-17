import { render } from "@testing-library/react";
import LoginForm from "../components/forms/LoginForm";

describe("LoginForm", () => {
  test("renders login form", () => {
    render(<LoginForm />);
  });
});