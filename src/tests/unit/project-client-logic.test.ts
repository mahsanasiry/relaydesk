import { describe, expect, it } from "vitest";
import { mapClient } from "@/features/clients/api";
import { emptyClientValues, toClientRecord } from "@/features/clients/payload";
import { mapProject } from "@/features/projects/api";
import { describeDateRange } from "@/features/projects/dates";
import {
  emptyProjectValues,
  toProjectFormValues,
  toProjectRecord,
} from "@/features/projects/payload";
import { isRealDate } from "@/lib/utils/date-input";
import { clientFormSchema } from "@/lib/validation/client";
import { projectFormSchema } from "@/lib/validation/project";

function problems(schema: typeof projectFormSchema | typeof clientFormSchema, values: object) {
  const result = schema.safeParse(values);
  return result.success
    ? []
    : result.error.issues.map((issue) => `${String(issue.path[0])}: ${issue.message}`);
}

describe("isRealDate", () => {
  it("accepts real dates and rejects impossible or badly written ones", () => {
    expect(isRealDate("2026-02-28")).toBe(true);
    expect(isRealDate("2028-02-29")).toBe(true);
    expect(isRealDate("2026-02-29")).toBe(false);
    expect(isRealDate("2026-13-01")).toBe(false);
    expect(isRealDate("1/2/2026")).toBe(false);
  });
});

describe("projectFormSchema", () => {
  const valid = { ...emptyProjectValues(), name: "Website redesign" };

  it("accepts a name with everything else at its default", () => {
    expect(problems(projectFormSchema, valid)).toEqual([]);
  });

  it("requires a name and limits its length", () => {
    expect(problems(projectFormSchema, { ...valid, name: "  " })).toEqual([
      "name: Enter a project name.",
    ]);
    expect(problems(projectFormSchema, { ...valid, name: "a".repeat(121) })).toEqual([
      "name: Use 120 characters or fewer.",
    ]);
  });

  it("rejects dates that do not exist", () => {
    expect(problems(projectFormSchema, { ...valid, startDate: "2026-02-31" })).toEqual([
      "startDate: Enter a valid date.",
    ]);
  });

  it("requires the end date to come on or after the start date", () => {
    expect(
      problems(projectFormSchema, {
        ...valid,
        startDate: "2026-11-10",
        endDate: "2026-11-09",
      }),
    ).toEqual(["endDate: The end date must be on or after the start date."]);
    expect(
      problems(projectFormSchema, {
        ...valid,
        startDate: "2026-11-10",
        endDate: "2026-11-10",
      }),
    ).toEqual([]);
    expect(problems(projectFormSchema, { ...valid, endDate: "2026-11-09" })).toEqual([]);
  });
});

describe("project mapping", () => {
  const project = mapProject({
    id: "p1",
    name: "Site",
    description: "",
    status: "active",
    client_id: null,
    start_date: "2026-11-01",
    end_date: null,
    created_at: "2026-10-01T00:00:00Z",
  });

  it("renames columns", () => {
    expect(project).toEqual({
      id: "p1",
      name: "Site",
      description: "",
      status: "active",
      clientId: null,
      startDate: "2026-11-01",
      endDate: null,
      createdAt: "2026-10-01T00:00:00Z",
    });
  });

  it("round-trips through the form with empty strings for missing values", () => {
    expect(toProjectFormValues(project)).toEqual({
      name: "Site",
      description: "",
      status: "active",
      clientId: "",
      startDate: "2026-11-01",
      endDate: "",
    });
    expect(toProjectRecord(toProjectFormValues(project))).toEqual({
      name: "Site",
      description: "",
      status: "active",
      client_id: null,
      start_date: "2026-11-01",
      end_date: null,
    });
  });

  it("presets the client when creating from a client page", () => {
    expect(emptyProjectValues("c1").clientId).toBe("c1");
  });
});

describe("clientFormSchema", () => {
  const valid = { ...emptyClientValues(), name: "Acme Ltd" };

  it("accepts a name alone", () => {
    expect(problems(clientFormSchema, valid)).toEqual([]);
  });

  it("requires a name", () => {
    expect(problems(clientFormSchema, { ...valid, name: "" })).toEqual([
      "name: Enter a client name.",
    ]);
  });

  it("accepts an empty or valid email and rejects anything else", () => {
    expect(problems(clientFormSchema, { ...valid, contactEmail: "" })).toEqual([]);
    expect(
      problems(clientFormSchema, {
        ...valid,
        contactEmail: "ops@acme.example",
      }),
    ).toEqual([]);
    expect(problems(clientFormSchema, { ...valid, contactEmail: "ops@" })).toEqual([
      "contactEmail: Enter a valid email address.",
    ]);
  });

  it("limits the notes", () => {
    expect(problems(clientFormSchema, { ...valid, notes: "a".repeat(2001) })).toEqual([
      "notes: Use 2000 characters or fewer.",
    ]);
  });
});

describe("client mapping", () => {
  it("renames columns and trims contact details on the way back", () => {
    const row = mapClient({
      id: "c1",
      name: "Acme",
      contact_name: "Sam",
      contact_email: "sam@acme.example",
      contact_phone: "",
      notes: "",
      created_at: "2026-10-01T00:00:00Z",
    });

    expect(row.contactEmail).toBe("sam@acme.example");
    expect(
      toClientRecord({
        name: " Acme ",
        contactName: " Sam ",
        contactEmail: " sam@acme.example ",
        contactPhone: " 555 ",
        notes: "Pays late",
      }),
    ).toEqual({
      name: "Acme",
      contact_name: "Sam",
      contact_email: "sam@acme.example",
      contact_phone: "555",
      notes: "Pays late",
    });
  });
});

describe("describeDateRange", () => {
  it("describes each combination of dates", () => {
    expect(describeDateRange("2026-11-01", "2026-12-01")).toBe("2026-11-01 to 2026-12-01");
    expect(describeDateRange("2026-11-01", null)).toBe("From 2026-11-01");
    expect(describeDateRange(null, "2026-12-01")).toBe("Until 2026-12-01");
    expect(describeDateRange(null, null)).toBe("No dates");
  });
});
