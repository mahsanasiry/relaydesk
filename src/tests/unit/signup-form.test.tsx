import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/features/auth/signup-form";

const mocks = vi.hoisted(() => ({ signUp: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("@/features/auth/actions", () => ({ signUpAction: mocks.signUp }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

beforeEach(() => {
  mocks.signUp.mockReset();
  mocks.replace.mockReset();
  mocks.refresh.mockReset();
});

async function fillAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  password = "long enough pw",
) {
  await user.type(screen.getByLabelText("Name"), "Ada Lovelace");
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), password);
  await user.click(screen.getByRole("button", { name: "Create account" }));
}

describe("SignupForm", () => {
  it("rejects a short password before calling the server", async () => {
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmit(user, "short");

    expect(await screen.findByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toHaveAccessibleDescription(
      "At least 8 characters. Use at least 8 characters.",
    );
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it("creates the account and opens the app", async () => {
    mocks.signUp.mockResolvedValue({ status: "success", redirectTo: "/app/dashboard" });
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmit(user);

    expect(mocks.signUp).toHaveBeenCalledWith({
      displayName: "Ada Lovelace",
      email: "ada@example.com",
      password: "long enough pw",
    });
    expect(mocks.replace).toHaveBeenCalledWith("/app/dashboard");
  });

  it("puts a taken email on the email field", async () => {
    mocks.signUp.mockResolvedValue({
      status: "error",
      field: "email",
      message: "An account with this email already exists. Log in instead.",
    });
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmit(user);

    expect(await screen.findByText(/already exists/)).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("tells the person to check their inbox when confirmation is required", async () => {
    mocks.signUp.mockResolvedValue({ status: "confirm_email" });
    const user = userEvent.setup();
    render(<SignupForm />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("status")).toHaveTextContent("ada@example.com");
    expect(screen.queryByRole("button", { name: "Create account" })).not.toBeInTheDocument();
  });
});
