import { describe, expect, it } from "vitest";
import { emptyFormValues, toRecord } from "@/features/requests/payload";
import { parseLabels, requestFormSchema } from "@/lib/validation/request";

const valid = { ...emptyFormValues(), title: "Fix login" };

function problems(values: object) {
  const result = requestFormSchema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
}

describe("parseLabels", () => {
  it("trims, drops blanks and repeats that differ only by case", () => {
    expect(parseLabels(" ops, Urgent ,,OPS,  ")).toEqual(["ops", "Urgent"]);
  });

  it("returns nothing for empty text", () => {
    expect(parseLabels("")).toEqual([]);
  });
});

describe("requestFormSchema", () => {
  it("accepts a title with everything else left at its default", () => {
    expect(problems(valid)).toEqual([]);
  });

  it("requires a title that is not only spaces", () => {
    expect(problems({ ...valid, title: "   " })).toEqual(["title: Enter a title."]);
  });

  it("limits the title length", () => {
    expect(problems({ ...valid, title: "a".repeat(201) })).toEqual([
      "title: Use 200 characters or fewer.",
    ]);
  });

  it("accepts a real due date and an empty one", () => {
    expect(problems({ ...valid, dueDate: "2026-11-04" })).toEqual([]);
    expect(problems({ ...valid, dueDate: "" })).toEqual([]);
  });

  it("rejects dates that do not exist", () => {
    expect(problems({ ...valid, dueDate: "2026-02-31" })).toEqual(["dueDate: Enter a valid date."]);
    expect(problems({ ...valid, dueDate: "11/04/2026" })).toEqual(["dueDate: Enter a valid date."]);
  });

  it("requires a reason for Blocked and nothing else", () => {
    expect(problems({ ...valid, status: "blocked" })).toEqual([
      "blockedReason: Choose why this request is blocked.",
    ]);
    expect(problems({ ...valid, status: "blocked", blockedReason: "technical_problem" })).toEqual(
      [],
    );
    expect(problems({ ...valid, status: "waiting" })).toEqual([]);
  });

  it("limits the number and length of labels", () => {
    const many = Array.from({ length: 11 }, (_, index) => `l${index}`).join(",");

    expect(problems({ ...valid, labels: many })).toEqual(["labels: Use at most 10 labels."]);
    expect(problems({ ...valid, labels: "a".repeat(31) })).toEqual([
      "labels: Keep each label to 30 characters or fewer.",
    ]);
  });
});

describe("toRecord", () => {
  it("turns empty form values into nulls and trims the title", () => {
    expect(toRecord({ ...valid, title: "  Fix login  ", labels: "a, b" })).toEqual({
      title: "Fix login",
      description: "",
      status: "new",
      priority: "medium",
      assignee_id: null,
      project_id: null,
      due_date: null,
      labels: ["a", "b"],
      blocked_reason: null,
      blocked_note: null,
    });
  });

  it("keeps the reason and trimmed note only while blocked", () => {
    const blocked = {
      ...valid,
      status: "blocked" as const,
      blockedReason: "waiting_for_client",
      blockedNote: "  Sent the quote  ",
    };

    expect(toRecord(blocked)).toMatchObject({
      status: "blocked",
      blocked_reason: "waiting_for_client",
      blocked_note: "Sent the quote",
    });
    expect(toRecord({ ...blocked, status: "in_progress" })).toMatchObject({
      status: "in_progress",
      blocked_reason: null,
      blocked_note: null,
    });
  });

  it("passes assignee, project and due date through", () => {
    expect(
      toRecord({ ...valid, assigneeId: "m1", projectId: "p1", dueDate: "2026-11-09" }),
    ).toMatchObject({ assignee_id: "m1", project_id: "p1", due_date: "2026-11-09" });
  });
});
