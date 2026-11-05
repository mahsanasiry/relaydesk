import { describe, expect, it } from "vitest";
import { NAV_ITEMS, isNavActive } from "@/components/layout/nav";

describe("isNavActive", () => {
  it("matches the section page itself", () => {
    expect(isNavActive("/app/requests", "/app/requests")).toBe(true);
  });

  it("keeps a section active on its detail and create pages", () => {
    expect(isNavActive("/app/requests/new", "/app/requests")).toBe(true);
    expect(isNavActive("/app/projects/abc-123", "/app/projects")).toBe(true);
  });

  it("does not confuse sections that share a prefix", () => {
    expect(isNavActive("/app/requests-archive", "/app/requests")).toBe(false);
    expect(isNavActive("/app/clients", "/app/projects")).toBe(false);
  });
});

describe("NAV_ITEMS", () => {
  it("covers every top-level screen once", () => {
    expect(NAV_ITEMS.map((item) => item.href)).toEqual([
      "/app/dashboard",
      "/app/requests",
      "/app/projects",
      "/app/clients",
      "/app/activity",
      "/app/notifications",
      "/app/settings",
    ]);
  });
});
