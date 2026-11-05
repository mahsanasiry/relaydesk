import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { AppShell } from "@/components/layout/app-shell";

vi.mock("next/navigation", () => ({ usePathname: () => "/app/requests/new" }));
vi.mock("@/features/auth/sign-out-button", () => ({
  SignOutButton: () => <button type="button">Log out</button>,
}));

// jsdom does not implement modal dialogs, so open and close are modelled by the attribute.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function renderShell() {
  return render(
    <AppShell userName="Ada Lovelace">
      <h1>Page content</h1>
    </AppShell>,
  );
}

function drawer(container: HTMLElement): HTMLDialogElement {
  const dialog = container.querySelector("dialog");
  if (!dialog) throw new Error("drawer not rendered");
  return dialog;
}

describe("AppShell", () => {
  it("renders the page inside the main landmark", () => {
    renderShell();

    expect(within(screen.getByRole("main")).getByRole("heading")).toHaveTextContent("Page content");
  });

  it("marks the current section by text-level semantics, not colour alone", () => {
    renderShell();
    const nav = screen.getByRole("navigation", { name: "Main" });

    expect(within(nav).getByRole("link", { name: "Requests" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Dashboard" })).not.toHaveAttribute(
      "aria-current",
    );
    expect(within(nav).getAllByRole("link")).toHaveLength(7);
  });

  it("sends the header search to the requests list as a query", () => {
    renderShell();
    const form = screen.getByRole("search");

    expect(form).toHaveAttribute("action", "/app/requests");
    expect(within(form).getByLabelText("Search requests")).toHaveAttribute("name", "q");
  });

  it("links to notifications", () => {
    renderShell();

    const links = screen.getAllByRole("link", { name: "Notifications" });

    expect(links.some((link) => link.getAttribute("href") === "/app/notifications")).toBe(true);
  });

  it("opens and closes the mobile drawer", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    expect(drawer(container)).not.toHaveAttribute("open");
    await user.click(screen.getByRole("button", { name: "Open menu" }));
    expect(drawer(container)).toHaveAttribute("open");

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(drawer(container)).not.toHaveAttribute("open");
  });

  it("closes the drawer after choosing a destination", async () => {
    const user = userEvent.setup();
    const { container } = renderShell();

    await user.click(screen.getByRole("button", { name: "Open menu" }));
    const mobileNav = within(drawer(container)).getByRole("navigation", { name: "Main (mobile)" });
    await user.click(within(mobileNav).getByRole("link", { name: "Projects" }));

    expect(drawer(container)).not.toHaveAttribute("open");
  });
});
