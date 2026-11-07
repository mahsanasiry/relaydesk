import { describe, expect, it } from "vitest";
import { mapWorkspace, toWorkspaceFormValues, toWorkspaceRecord } from "@/features/settings/api";
import { profileFormSchema, workspaceFormSchema } from "@/lib/validation/settings";

const valid = {
  name: "Fernhill Studio",
  waitingThresholdDays: "3",
  dueWindowDays: "2",
};

describe("workspaceFormSchema", () => {
  it("accepts the boundaries", () => {
    expect(workspaceFormSchema.safeParse(valid).success).toBe(true);
    expect(
      workspaceFormSchema.safeParse({
        ...valid,
        waitingThresholdDays: "60",
        dueWindowDays: "30",
      }).success,
    ).toBe(true);
    expect(
      workspaceFormSchema.safeParse({
        ...valid,
        waitingThresholdDays: "1",
        dueWindowDays: "1",
      }).success,
    ).toBe(true);
  });

  it("rejects numbers outside the allowed range", () => {
    for (const bad of ["0", "61", "-1", "2.5", "", "abc", "1e1"]) {
      expect(workspaceFormSchema.safeParse({ ...valid, waitingThresholdDays: bad }).success).toBe(
        false,
      );
    }
    expect(workspaceFormSchema.safeParse({ ...valid, dueWindowDays: "31" }).success).toBe(false);
  });

  it("explains the range in the message", () => {
    const result = workspaceFormSchema.safeParse({
      ...valid,
      dueWindowDays: "0",
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe("Enter a whole number from 1 to 30.");
  });

  it("requires a name that is not only spaces", () => {
    const result = workspaceFormSchema.safeParse({ ...valid, name: "   " });

    expect(result.error?.issues[0]?.message).toBe("Enter a workspace name.");
  });
});

describe("profileFormSchema", () => {
  it("requires a name and limits its length", () => {
    expect(profileFormSchema.safeParse({ displayName: " " }).success).toBe(false);
    expect(profileFormSchema.safeParse({ displayName: "x".repeat(81) }).success).toBe(false);
    expect(profileFormSchema.safeParse({ displayName: "Ada" }).success).toBe(true);
  });
});

describe("workspace mapping", () => {
  it("maps columns to form text and back to numbers", () => {
    const workspace = mapWorkspace({
      id: "w1",
      name: "Fernhill Studio",
      waiting_threshold_days: 3,
      due_window_days: 2,
    });

    expect(toWorkspaceFormValues(workspace)).toEqual(valid);
    expect(toWorkspaceRecord({ ...valid, name: "  Fernhill  " })).toEqual({
      name: "Fernhill",
      waiting_threshold_days: 3,
      due_window_days: 2,
    });
  });
});
