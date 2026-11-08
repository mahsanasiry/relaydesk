import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("landing page", () => {
  it("has one top-level heading and a main landmark", () => {
    render(<Home />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main");
  });

  it("links to login and signup", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", "/signup");
    expect(screen.getByRole("link", { name: "Get started" })).toHaveAttribute("href", "/signup");
  });

  it("opens the demo workspace from a plain link", () => {
    render(<Home />);

    expect(screen.getByRole("link", { name: "Try the demo" })).toHaveAttribute("href", "/demo");
  });

  it("describes each way RelayDesk differs from a task list", () => {
    render(<Home />);

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(3);
  });
});
