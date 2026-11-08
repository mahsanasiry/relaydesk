import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/demo/route";
import { DEMO_EMAIL, DEMO_PASSWORD } from "@/features/auth/demo";

const mocks = vi.hoisted(() => ({ signIn: vi.fn(), createClient: vi.fn() }));

vi.mock("next/navigation", () => ({
  // The real redirect() throws, which is what stops the handler there.
  redirect: (path: string) => {
    throw new Error(`redirect:${path}`);
  },
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient: mocks.createClient }));

beforeEach(() => {
  mocks.signIn.mockReset();
  mocks.createClient.mockReset();
  mocks.createClient.mockResolvedValue({ auth: { signInWithPassword: mocks.signIn } });
});

describe("GET /demo", () => {
  it("signs in to the sample workspace and opens the dashboard", async () => {
    mocks.signIn.mockResolvedValue({ error: null });

    await expect(GET()).rejects.toThrow("redirect:/app/dashboard");
    expect(mocks.signIn).toHaveBeenCalledWith({ email: DEMO_EMAIL, password: DEMO_PASSWORD });
  });

  it("returns to the log in page with an explanation when the sign in is refused", async () => {
    mocks.signIn.mockResolvedValue({ error: { code: "invalid_credentials" } });

    await expect(GET()).rejects.toThrow("redirect:/login?demo=unavailable");
  });

  it("does the same when the auth service cannot be reached", async () => {
    mocks.signIn.mockRejectedValue(new Error("network"));

    await expect(GET()).rejects.toThrow("redirect:/login?demo=unavailable");
  });

  it("does the same when Supabase is not configured", async () => {
    mocks.createClient.mockRejectedValue(new Error("Supabase is not configured."));

    await expect(GET()).rejects.toThrow("redirect:/login?demo=unavailable");
  });
});
