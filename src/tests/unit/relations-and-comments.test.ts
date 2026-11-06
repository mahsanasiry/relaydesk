import { describe, expect, it } from "vitest";
import { orderedPair, otherEnd } from "@/features/requests/relations";
import { commentSchema } from "@/lib/validation/comment";

describe("orderedPair", () => {
  const low = "0a000000-0000-4000-8000-000000000001";
  const high = "fb000000-0000-4000-8000-000000000001";

  it("puts the smaller id first whichever way the pair is given", () => {
    const expected = { requestId: low, relatedRequestId: high };

    expect(orderedPair(low, high)).toEqual(expected);
    expect(orderedPair(high, low)).toEqual(expected);
  });

  it("compares lowercase so a pasted uppercase id still sorts the way the database does", () => {
    expect(orderedPair(high.toUpperCase(), low)).toEqual({
      requestId: low,
      relatedRequestId: high,
    });
  });
});

describe("otherEnd", () => {
  const row = { request_id: "aaa", related_request_id: "bbb" };

  it("returns the id on the other side of the link", () => {
    expect(otherEnd(row, "aaa")).toBe("bbb");
    expect(otherEnd(row, "bbb")).toBe("aaa");
  });

  it("ignores the case of the id it is asked about", () => {
    expect(otherEnd(row, "AAA")).toBe("bbb");
  });
});

describe("commentSchema", () => {
  it("accepts text and trims it", () => {
    const result = commentSchema.safeParse({ body: "  Looks good  " });

    expect(result.success && result.data.body).toBe("Looks good");
  });

  it("refuses an empty or whitespace-only comment", () => {
    const result = commentSchema.safeParse({ body: "   " });

    expect(result.success).toBe(false);
    expect(!result.success && result.error.issues[0]?.message).toBe("Write a comment first.");
  });

  it("limits the length", () => {
    expect(commentSchema.safeParse({ body: "a".repeat(5000) }).success).toBe(true);
    expect(commentSchema.safeParse({ body: "a".repeat(5001) }).success).toBe(false);
  });
});
