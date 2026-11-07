import { describe, expect, it } from "vitest";
import { DEFAULT_REQUEST_QUERY } from "@/features/requests/filters";
import {
  VIEW_PRESETS,
  canSaveView,
  canonicalViewQuery,
  isActiveView,
  normalizeStoredQuery,
  presetQuery,
  validateViewName,
  viewHref,
} from "@/features/saved-views/model";

function preset(id: string) {
  const found = VIEW_PRESETS.find((item) => item.id === id);
  if (!found) throw new Error(`missing preset ${id}`);
  return found;
}

describe("presets", () => {
  it("serialize to the URLs the list understands", () => {
    expect(presetQuery(preset("my-open"))).toBe("status=open&assignee=me");
    expect(presetQuery(preset("high-priority"))).toBe("priority=high");
    expect(presetQuery(preset("waiting-client"))).toBe("status=blocked&reason=waiting_for_client");
    expect(presetQuery(preset("overdue"))).toBe("due=overdue");
  });

  it("has the four views the product promises", () => {
    expect(VIEW_PRESETS.map((item) => item.name)).toEqual([
      "My Open Requests",
      "High Priority",
      "Waiting for Client",
      "Overdue",
    ]);
  });
});

describe("canonical queries", () => {
  it("leaves the page out", () => {
    expect(
      canonicalViewQuery({
        ...DEFAULT_REQUEST_QUERY,
        priorities: ["high"],
        page: 4,
      }),
    ).toBe("priority=high");
  });

  it("re-reads stored text so an older spelling still matches", () => {
    expect(normalizeStoredQuery("assignee=me&status=new,in_progress,waiting,blocked&page=3")).toBe(
      "status=open&assignee=me",
    );
    expect(normalizeStoredQuery("")).toBe("");
  });

  it("builds links to the list", () => {
    expect(viewHref("")).toBe("/app/requests");
    expect(viewHref("due=overdue")).toBe("/app/requests?due=overdue");
  });

  it("recognises the active view whatever page the list is on", () => {
    const current = { ...DEFAULT_REQUEST_QUERY, overdueOnly: true, page: 2 };

    expect(isActiveView(current, "due=overdue")).toBe(true);
    expect(isActiveView(current, "priority=high")).toBe(false);
  });

  it("only offers to save a filtered list", () => {
    expect(canSaveView(DEFAULT_REQUEST_QUERY)).toBe(false);
    expect(canSaveView({ ...DEFAULT_REQUEST_QUERY, search: "login" })).toBe(true);
  });
});

describe("validateViewName", () => {
  const existing = [
    { id: "v1", name: "Client chasers" },
    { id: "v2", name: "Mine" },
  ];

  it("accepts a fresh name", () => {
    expect(validateViewName("  Urgent  ", existing)).toBeNull();
  });

  it("rejects an empty or too long name", () => {
    expect(validateViewName("   ", existing)).toBe("Enter a name for this view.");
    expect(validateViewName("x".repeat(61), existing)).toBe(
      "Keep the name to 60 characters or fewer.",
    );
  });

  it("rejects a name that differs from another only by case", () => {
    expect(validateViewName("client CHASERS", existing)).toBe(
      "You already have a view with that name.",
    );
  });

  it("lets a view keep its own name when renamed", () => {
    expect(validateViewName("Mine", existing, "v2")).toBeNull();
  });
});
