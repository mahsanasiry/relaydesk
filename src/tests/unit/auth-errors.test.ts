import { describe, expect, it } from "vitest";
import { describeAuthError } from "@/features/auth/errors";

describe("describeAuthError", () => {
  it("does not reveal whether the email or the password was wrong", () => {
    expect(describeAuthError({ code: "invalid_credentials", status: 400 })).toEqual({
      message: "The email or password is incorrect.",
    });
  });

  it("points an existing address at the email field", () => {
    expect(describeAuthError({ code: "user_already_exists" }).field).toBe("email");
    expect(describeAuthError({ code: "email_exists" }).field).toBe("email");
  });

  it("points a weak password at the password field", () => {
    expect(describeAuthError({ code: "weak_password" }).field).toBe("password");
  });

  it("treats rate limits the same whatever the code says", () => {
    const byCode = describeAuthError({ code: "over_request_rate_limit" });

    expect(byCode.message).toContain("Too many attempts");
    expect(describeAuthError({ status: 429 })).toEqual(byCode);
  });

  it("explains a network failure", () => {
    expect(describeAuthError({ status: 0 }).message).toContain("Could not reach the server");
  });

  it("falls back to a generic message for anything else", () => {
    expect(describeAuthError({ code: "unexpected_failure", status: 500 })).toEqual({
      message: "Something went wrong on our side. Try again in a moment.",
    });
  });
});
