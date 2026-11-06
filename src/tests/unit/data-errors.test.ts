import { describe, expect, it } from "vitest";
import { describeDataError } from "@/lib/errors";

function failure(cause: unknown) {
  return new Error("Could not save the request.", { cause });
}

describe("describeDataError", () => {
  it("explains a permission failure", () => {
    expect(describeDataError(failure({ code: "42501", message: "new row violates policy" }))).toBe(
      "You do not have permission to do that.",
    );
  });

  it("asks the person to log in again when the session has expired", () => {
    expect(describeDataError(failure({ code: "PGRST301", message: "JWT expired" }))).toContain(
      "Log in again",
    );
    expect(describeDataError(failure({ code: "", message: "invalid JWT" }))).toContain(
      "Log in again",
    );
  });

  it("explains a link to something that was deleted", () => {
    expect(
      describeDataError(failure({ code: "23503", message: "violates foreign key" })),
    ).toContain("no longer exists");
  });

  it("explains a duplicate", () => {
    expect(describeDataError(failure({ code: "23505", message: "duplicate key" }))).toBe(
      "That already exists.",
    );
  });

  it("explains a network failure", () => {
    expect(
      describeDataError(failure({ code: "", message: "TypeError: Failed to fetch" })),
    ).toContain("Could not reach the server");
  });

  it("never shows the raw database message", () => {
    const text = describeDataError(
      failure({ code: "XX000", message: 'relation "requests" is broken' }),
    );

    expect(text).toBe("Something went wrong. Try again in a moment.");
  });

  it("copes with errors that carry no cause", () => {
    expect(describeDataError(new Error("The request no longer exists."))).toBe(
      "Something went wrong. Try again in a moment.",
    );
    expect(describeDataError("boom")).toBe("Something went wrong. Try again in a moment.");
  });
});
