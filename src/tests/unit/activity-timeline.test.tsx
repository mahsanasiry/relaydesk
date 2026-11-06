import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityTimeline } from "@/features/activity/components/activity-timeline";
import type { ActivityEvent } from "@/features/activity/model";

const mocks = vi.hoisted(() => ({ refetch: vi.fn(), activity: {} as Record<string, unknown> }));

vi.mock("@/features/members/queries", () => ({
  useMembers: () => ({ data: [{ id: "m1", displayName: "Maya Okafor" }] }),
}));
vi.mock("@/features/activity/queries", () => ({ useRequestActivity: () => mocks.activity }));

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: "e",
    requestId: "r1",
    requestTitle: "Fix login",
    actorId: "m1",
    type: "comment_added",
    metadata: {},
    createdAt: "2026-11-04T10:00:00Z",
    ...overrides,
  };
}

function load(data: ActivityEvent[]) {
  mocks.activity = { data, isPending: false, isError: false, refetch: mocks.refetch };
}

beforeEach(() => {
  mocks.refetch.mockReset();
  load([
    event({
      id: "e1",
      type: "status_changed",
      metadata: {
        from: "in_progress",
        to: "blocked",
        blocked_reason: "technical_problem",
        blocked_note: "Vendor outage",
      },
    }),
    event({ id: "e2", type: "comment_added", actorId: null }),
    event({ id: "e3", type: "priority_changed", metadata: { from: "low", to: "high" } }),
  ]);
});

describe("ActivityTimeline", () => {
  it("tells the story of each event in words, newest first as supplied", () => {
    render(<ActivityTimeline requestId="r1" />);
    const items = within(screen.getByRole("list")).getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent(
      "Maya Okafor changed the status from In progress to Blocked (Technical problem: Vendor outage)",
    );
    expect(items[1]).toHaveTextContent("Former member added a comment");
    expect(items[2]).toHaveTextContent("Maya Okafor changed the priority from Low to High");
  });

  it("filters by kind of event", async () => {
    const user = userEvent.setup();
    render(<ActivityTimeline requestId="r1" />);

    await user.selectOptions(screen.getByLabelText("Show"), "comments");

    const items = within(screen.getByRole("list")).getAllByRole("listitem");
    expect(items).toHaveLength(1);
    expect(items[0]).toHaveTextContent("added a comment");
  });

  it("says when a filter matches nothing", async () => {
    const user = userEvent.setup();
    render(<ActivityTimeline requestId="r1" />);

    await user.selectOptions(screen.getByLabelText("Show"), "due_date");

    expect(screen.getByText("No activity matches this filter.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("says so when nothing has happened", () => {
    load([]);
    render(<ActivityTimeline requestId="r1" />);

    expect(screen.getByText("Nothing has happened yet.")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", async () => {
    mocks.activity = { data: undefined, isPending: false, isError: true, refetch: mocks.refetch };
    const user = userEvent.setup();
    render(<ActivityTimeline requestId="r1" />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });
});
