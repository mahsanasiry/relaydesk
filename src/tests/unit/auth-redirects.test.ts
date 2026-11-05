import { describe, expect, it } from "vitest";
import { APP_HOME, isProtectedPath, resolveAuthRedirect, safeNextPath } from "@/lib/auth/redirects";

describe("isProtectedPath", () => {
  it("covers the app and everything beneath it", () => {
    expect(isProtectedPath("/app")).toBe(true);
    expect(isProtectedPath("/app/requests/123")).toBe(true);
  });

  it("does not cover public pages or look-alike prefixes", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/application")).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("keeps paths inside the app, query string included", () => {
    expect(safeNextPath("/app/requests?status=open&page=2")).toBe(
      "/app/requests?status=open&page=2",
    );
    expect(safeNextPath("/app")).toBe("/app");
  });

  it("falls back to the dashboard when nothing is given", () => {
    expect(safeNextPath(null)).toBe(APP_HOME);
    expect(safeNextPath("")).toBe(APP_HOME);
  });

  it.each([
    "https://evil.example/app",
    "//evil.example",
    "/login",
    "/application",
    "/app\\evil",
    "/app/\nSet-Cookie: a=b",
  ])("rejects %j", (value) => {
    expect(safeNextPath(value)).toBe(APP_HOME);
  });
});

describe("resolveAuthRedirect", () => {
  it("sends a signed-out visitor to login and remembers where they were going", () => {
    expect(
      resolveAuthRedirect({ pathname: "/app/requests", search: "?status=open", isSignedIn: false }),
    ).toBe("/login?next=%2Fapp%2Frequests%3Fstatus%3Dopen");
  });

  it("leaves the address clean when the destination is the default one", () => {
    expect(resolveAuthRedirect({ pathname: "/app", search: "", isSignedIn: false })).toBe("/login");
    expect(resolveAuthRedirect({ pathname: "/app/dashboard", search: "", isSignedIn: false })).toBe(
      "/login",
    );
  });

  it("sends a signed-in visitor away from login and signup", () => {
    expect(resolveAuthRedirect({ pathname: "/login", search: "", isSignedIn: true })).toBe(
      APP_HOME,
    );
    expect(resolveAuthRedirect({ pathname: "/signup", search: "", isSignedIn: true })).toBe(
      APP_HOME,
    );
  });

  it("follows a safe next parameter after login", () => {
    expect(
      resolveAuthRedirect({
        pathname: "/login",
        search: "?next=%2Fapp%2Frequests",
        isSignedIn: true,
      }),
    ).toBe("/app/requests");
  });

  it("ignores a next parameter that leaves the app", () => {
    expect(
      resolveAuthRedirect({
        pathname: "/login",
        search: "?next=https%3A%2F%2Fevil.example",
        isSignedIn: true,
      }),
    ).toBe(APP_HOME);
  });

  it("lets everyone else through", () => {
    expect(resolveAuthRedirect({ pathname: "/login", search: "", isSignedIn: false })).toBeNull();
    expect(
      resolveAuthRedirect({ pathname: "/app/requests", search: "", isSignedIn: true }),
    ).toBeNull();
    expect(resolveAuthRedirect({ pathname: "/", search: "", isSignedIn: true })).toBeNull();
  });
});
