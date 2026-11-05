import { describe, expect, it } from "vitest";
import { loginSchema, signupSchema } from "@/lib/validation/auth";

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues.map((issue) => issue.message) ?? [];
}

describe("loginSchema", () => {
  it("accepts an email and a password and trims the email", () => {
    const result = loginSchema.safeParse({ email: "  ada@example.com ", password: "x" });

    expect(result.success && result.data.email).toBe("ada@example.com");
  });

  it("asks for each missing field", () => {
    expect(messages(loginSchema.safeParse({ email: "", password: "" }))).toEqual([
      "Enter your email address.",
      "Enter your password.",
    ]);
  });

  it("rejects something that is not an email", () => {
    expect(messages(loginSchema.safeParse({ email: "ada", password: "x" }))).toEqual([
      "Enter a valid email address.",
    ]);
  });
});

describe("signupSchema", () => {
  const valid = { displayName: "Ada Lovelace", email: "ada@example.com", password: "12345678" };

  it("accepts valid details and trims the name", () => {
    const result = signupSchema.safeParse({ ...valid, displayName: "  Ada  " });

    expect(result.success && result.data.displayName).toBe("Ada");
  });

  it("requires a name that is not only spaces", () => {
    expect(messages(signupSchema.safeParse({ ...valid, displayName: "   " }))).toEqual([
      "Enter your name.",
    ]);
  });

  it("limits the name length", () => {
    const result = signupSchema.safeParse({ ...valid, displayName: "a".repeat(81) });

    expect(messages(result)).toEqual(["Use 80 characters or fewer."]);
  });

  it("enforces the password length on both ends", () => {
    expect(messages(signupSchema.safeParse({ ...valid, password: "1234567" }))).toEqual([
      "Use at least 8 characters.",
    ]);
    expect(messages(signupSchema.safeParse({ ...valid, password: "a".repeat(73) }))).toEqual([
      "Use 72 characters or fewer.",
    ]);
    expect(signupSchema.safeParse({ ...valid, password: "a".repeat(72) }).success).toBe(true);
  });
});
