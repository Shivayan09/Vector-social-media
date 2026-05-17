import { render } from "@testing-library/react";
import RegistrationForm from "../components/forms/RegistrationForm";

describe("RegistrationForm", () => {
  test("renders registration form", () => {
    render(<RegistrationForm />);
  });
});
