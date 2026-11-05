import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/features/auth/login-form";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), replace: vi.fn(), refresh: vi.fn() }));

vi.mock("@/features/auth/actions", () => ({ signInAction: mocks.signIn }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

beforeEach(() => {
  mocks.signIn.mockReset();
  mocks.replace.mockReset();
  mocks.refresh.mockReset();
});

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Email"), "ada@example.com");
  await user.type(screen.getByLabelText("Password"), "correct horse");
  await user.click(screen.getByRole("button", { name: "Log in" }));
}

describe("LoginForm", () => {
  it("explains what is missing without calling the server", async () => {
    const user = userEvent.setup();
    render(<LoginForm next={null} />);

    await user.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("Enter your email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInvalid();
    expect(mocks.signIn).not.toHaveBeenCalled();
  });

  it("signs in and moves on to the requested page", async () => {
    mocks.signIn.mockResolvedValue({ status: "success", redirectTo: "/app/requests" });
    const user = userEvent.setup();
    render(<LoginForm next="/app/requests" />);

    await fillAndSubmit(user);

    expect(mocks.signIn).toHaveBeenCalledWith(
      { email: "ada@example.com", password: "correct horse" },
      "/app/requests",
    );
    expect(mocks.replace).toHaveBeenCalledWith("/app/requests");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("shows the server's reason and lets the person try again", async () => {
    mocks.signIn.mockResolvedValue({
      status: "error",
      message: "The email or password is incorrect.",
    });
    const user = userEvent.setup();
    render(<LoginForm next={null} />);

    await fillAndSubmit(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The email or password is incorrect.",
    );
    expect(screen.getByRole("button", { name: "Log in" })).toBeEnabled();
    expect(mocks.replace).not.toHaveBeenCalled();
  });

  it("disables the button while the request is in flight", async () => {
    let finish: (value: unknown) => void = () => {};
    mocks.signIn.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<LoginForm next={null} />);

    await fillAndSubmit(user);

    const busy = await screen.findByRole("button", { name: "Logging in..." });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");

    finish({ status: "error", message: "Try later." });
    expect(await screen.findByRole("button", { name: "Log in" })).toBeEnabled();
  });
});
