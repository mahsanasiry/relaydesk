import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import LoginPage from "@/app/(auth)/login/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/features/auth/actions", () => ({ signInAction: vi.fn() }));

async function renderPage(params: Record<string, string | string[] | undefined> = {}) {
  render(await LoginPage({ searchParams: Promise.resolve(params) }));
}

describe("log in page", () => {
  it("offers the demo as a plain link next to the form", async () => {
    await renderPage();

    expect(screen.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("explains when the demo could not be opened", async () => {
    await renderPage({ demo: "unavailable" });

    expect(screen.getByRole("alert")).toHaveTextContent("The demo is not available right now.");
  });
});
