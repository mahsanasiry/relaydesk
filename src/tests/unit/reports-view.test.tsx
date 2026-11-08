import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@/features/activity/model";
import type { RequestRow } from "@/features/requests/api";
import { ReportsView } from "@/features/reports/components/reports-view";

const NOW = Date.parse("2026-11-04T10:00:00Z");

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  requests: {} as Record<string, unknown>,
  members: {} as Record<string, unknown>,
  history: {} as Record<string, unknown>,
}));

vi.mock("@/features/requests/queries", () => ({ useRequests: () => mocks.requests }));
vi.mock("@/features/members/queries", () => ({ useMembers: () => mocks.members }));
vi.mock("@/features/reports/queries", () => ({ useBlockerHistory: () => mocks.history }));

function request(overrides: Partial<RequestRow>): RequestRow {
  return {
    id: "r",
    title: "A request",
    status: "blocked",
    priority: "medium",
    assigneeId: "m1",
    projectId: null,
    clientId: null,
    dueDate: null,
    blockedReason: "technical_problem",
    statusChangedAt: "2026-11-03T10:00:00Z",
    updatedAt: "2026-11-03T10:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function event(overrides: Partial<ActivityEvent>): ActivityEvent {
  return {
    id: "e",
    requestId: "r1",
    requestTitle: "Moved",
    actorId: "m1",
    type: "status_changed",
    metadata: {},
    createdAt: "2026-10-01T10:00:00Z",
    ...overrides,
  };
}

function ok(data: unknown, extra: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mocks.refetch, ...extra };
}

beforeEach(() => {
  mocks.refetch.mockReset();
  mocks.requests = ok(
    [
      request({ id: "a", title: "Broken export", statusChangedAt: "2026-11-01T10:00:00Z" }),
      request({ id: "b", title: "Flaky login", assigneeId: null }),
      request({
        id: "c",
        title: "Contract review",
        blockedReason: "waiting_for_client",
        statusChangedAt: "2026-11-04T07:00:00Z",
      }),
      request({ id: "d", title: "Shipped", status: "done", blockedReason: null }),
    ],
    { dataUpdatedAt: NOW },
  );
  mocks.members = ok([{ id: "m1", displayName: "Maya Okafor" }]);
  mocks.history = ok([
    event({
      id: "e1",
      requestId: "r1",
      createdAt: "2026-10-01T10:00:00Z",
      metadata: { from: "new", to: "blocked", blocked_reason: "technical_problem" },
    }),
    event({
      id: "e2",
      requestId: "r1",
      createdAt: "2026-10-03T10:00:00Z",
      metadata: { from: "blocked", to: "in_progress" },
    }),
  ]);
});

describe("ReportsView", () => {
  it("counts what is stopped per reason and links to the matching list", () => {
    render(<ReportsView />);
    const section = within(screen.getByRole("region", { name: "Stopped right now" }));

    expect(section.getByText("3 requests are blocked, grouped by why.")).toBeInTheDocument();
    expect(section.getByRole("link", { name: "Technical problem" })).toHaveAttribute(
      "href",
      "/app/requests?status=blocked&reason=technical_problem",
    );
    expect(
      section.getByText("Blocked for 2 days on average, 3 days at the longest."),
    ).toBeInTheDocument();
    expect(
      section.getByText("Blocked for 3 hours on average, 3 hours at the longest."),
    ).toBeInTheDocument();
    expect(section.getAllByText("Nothing is stopped for this reason.")).toHaveLength(2);
  });

  it("lists the longest blockers first with who owns them", () => {
    render(<ReportsView />);
    const section = within(screen.getByRole("region", { name: "Stopped the longest" }));
    const items = section.getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(
      within(items[0] as HTMLElement).getByRole("link", { name: "Broken export" }),
    ).toHaveAttribute("href", "/app/requests/a");
    expect(items[0]).toHaveTextContent("Maya Okafor");
    expect(items[0]).toHaveTextContent("3 days");
    expect(items[1]).toHaveTextContent("Unassigned");
    expect(section.queryByText("Shipped")).not.toBeInTheDocument();
  });

  it("shows how long cleared blockers lasted", () => {
    render(<ReportsView />);
    const section = within(screen.getByRole("region", { name: "How long blockers last" }));
    const row = section.getByRole("row", { name: /Technical problem/ });

    expect(
      within(row)
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "2 days", "2 days"]);
    expect(
      within(section.getByRole("row", { name: /Waiting for client/ })).getAllByRole("cell")[1],
    ).toHaveTextContent("None yet");
  });

  it("says so when nothing is blocked or cleared", () => {
    mocks.requests = ok([request({ id: "x", status: "in_progress", blockedReason: null })], {
      dataUpdatedAt: NOW,
    });
    mocks.history = ok([]);
    render(<ReportsView />);

    expect(screen.getByText("Nothing is blocked.")).toBeInTheDocument();
    expect(screen.getByText("Nothing is blocked right now.")).toBeInTheDocument();
    expect(
      screen.getByText("No blocker has been cleared in the last 90 days."),
    ).toBeInTheDocument();
  });

  it("shows a loading state while data arrives", () => {
    mocks.history = { ...ok(undefined), isPending: true };
    render(<ReportsView />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading requests");
  });

  it("explains a loading failure and retries only what failed", async () => {
    const user = userEvent.setup();
    mocks.history = { ...ok(undefined), isError: true };
    render(<ReportsView />);

    expect(screen.getByRole("alert")).toHaveTextContent("The reports could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});
