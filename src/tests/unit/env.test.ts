import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabaseEnv } from "@/lib/env";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getSupabaseEnv", () => {
  it("returns the trimmed values", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", " https://abcd.supabase.co ");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");

    expect(getSupabaseEnv()).toEqual({
      url: "https://abcd.supabase.co",
      publishableKey: "sb_publishable_x",
    });
  });

  it("names every variable that is missing", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");

    expect(() => getSupabaseEnv()).toThrow(
      "Missing: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  });

  it("rejects a URL that cannot be parsed", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "abcd.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_x");

    expect(() => getSupabaseEnv()).toThrow("not a valid URL");
  });
});
