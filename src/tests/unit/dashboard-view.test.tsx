import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@/features/activity/model";
import { DashboardView } from "@/features/dashboard/components/dashboard-view";
import type { RequestRow } from "@/features/requests/api";

const NOW = Date.parse("2026-11-04T10:00:00Z");

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  requests: {} as Record<string, unknown>,
  projects: {} as Record<string, unknown>,
  members: {} as Record<string, unknown>,
  settings: {} as Record<string, unknown>,
  activity: {} as Record<string, unknown>,
}));

vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ id: "me-id", displayName: "Ada", workspaceId: "w1" }),
}));
vi.mock("@/features/requests/queries", () => ({ useRequests: () => mocks.requests }));
vi.mock("@/features/projects/queries", () => ({ useProjects: () => mocks.projects }));
vi.mock("@/features/members/queries", () => ({ useMembers: () => mocks.members }));
vi.mock("@/features/dashboard/queries", () => ({ useWorkspaceSettings: () => mocks.settings }));
vi.mock("@/features/activity/queries", () => ({ useRecentActivity: () => mocks.activity }));

function request(overrides: Partial<RequestRow>): RequestRow {
  return {
    id: "r",
    title: "A request",
    status: "in_progress",
    priority: "medium",
    assigneeId: "m1",
    projectId: null,
    clientId: null,
    dueDate: null,
    blockedReason: null,
    statusChangedAt: "2026-11-03T09:00:00Z",
    updatedAt: "2026-11-03T09:00:00Z",
    archivedAt: null,
    ...overrides,
  };
}

function ok(data: unknown, extra: Record<string, unknown> = {}) {
  return { data, isPending: false, isError: false, refetch: mocks.refetch, ...extra };
}

const activityEvent: ActivityEvent = {
  id: "e1",
  requestId: "late",
  requestTitle: "Late invoice",
  actorId: "m1",
  type: "priority_changed",
  metadata: { from: "low", to: "high" },
  createdAt: "2026-11-04T09:00:00Z",
};

beforeEach(() => {
  mocks.refetch.mockReset();
  mocks.requests = ok(
    [
      request({ id: "late", title: "Late invoice", assigneeId: "me-id", dueDate: "2026-11-03" }),
      request({
        id: "waits",
        title: "Awaiting sign-off",
        status: "waiting",
        statusChangedAt: "2026-10-30T09:00:00Z",
      }),
      request({
        id: "stuck",
        title: "Broken export",
        status: "blocked",
        blockedReason: "technical_problem",
      }),
      request({ id: "finished", title: "Shipped", status: "done" }),
      request({ id: "nobody", title: "Nobody owns this", status: "new", assigneeId: null }),
    ],
    { dataUpdatedAt: NOW },
  );
  mocks.projects = ok([
    { id: "p1", name: "Site", status: "active" },
    { id: "p2", name: "App", status: "active" },
    { id: "p3", name: "Old", status: "completed" },
  ]);
  mocks.members = ok([{ id: "m1", displayName: "Maya Okafor" }]);
  mocks.settings = ok({ waitingThresholdDays: 3, dueWindowDays: 2 });
  mocks.activity = ok([activityEvent]);
});

function statLink(name: RegExp) {
  return screen.getByRole("link", { name });
}

describe("DashboardView", () => {
  it("counts open, overdue, waiting and assigned work, each linking to the matching list", () => {
    render(<DashboardView />);

    const open = statLink(/Open requests/);
    expect(within(open).getByText("4")).toBeInTheDocument();
    expect(open).toHaveAttribute("href", "/app/requests?status=open");

    const overdue = statLink(/Overdue/);
    expect(within(overdue).getByText("1")).toBeInTheDocument();
    expect(overdue).toHaveAttribute("href", "/app/requests?due=overdue");

    const waiting = statLink(/^Waiting\d/);
    expect(within(waiting).getByText("1")).toBeInTheDocument();
    expect(waiting).toHaveAttribute("href", "/app/requests?status=waiting");

    const mine = statLink(/Assigned to me/);
    expect(within(mine).getByText("1")).toBeInTheDocument();
    expect(mine).toHaveAttribute("href", "/app/requests?status=open&assignee=me");
  });

  it("lists what needs attention and says which rule put each request there", () => {
    render(<DashboardView />);
    const section = within(screen.getByRole("region", { name: "Needs attention" }));

    expect(section.getByText("Overdue by 1 day (due 2026-11-03)")).toBeInTheDocument();
    expect(
      section.getByText("Waiting for 5 days, longer than the 3 days limit"),
    ).toBeInTheDocument();
    expect(section.getByText("No one is assigned")).toBeInTheDocument();
    expect(section.queryByText("Broken export")).not.toBeInTheDocument();
    expect(section.queryByText("Shipped")).not.toBeInTheDocument();
  });

  it("groups blocked work by reason, including reasons with nothing in them", () => {
    render(<DashboardView />);
    const section = within(screen.getByRole("region", { name: "Blocked, by reason" }));

    expect(section.getAllByRole("listitem").length).toBeGreaterThanOrEqual(4);
    const technical = section.getByRole("link", { name: "Technical problem" });
    expect(technical).toHaveAttribute(
      "href",
      "/app/requests?status=blocked&reason=technical_problem",
    );
    expect(section.getByRole("link", { name: "Broken export" })).toHaveAttribute(
      "href",
      "/app/requests/stuck",
    );
    expect(section.getByRole("link", { name: "Waiting for client" })).toBeInTheDocument();
  });

  it("summarises projects by status", () => {
    render(<DashboardView />);
    const section = within(screen.getByRole("region", { name: "Projects" }));

    expect(section.getByText("Active").nextElementSibling).toHaveTextContent("2");
    expect(section.getByText("Completed").nextElementSibling).toHaveTextContent("1");
    expect(section.getByText("On hold").nextElementSibling).toHaveTextContent("0");
  });

  it("shows recent activity with the request it happened on", () => {
    render(<DashboardView />);
    const section = within(screen.getByRole("region", { name: "Recent activity" }));

    expect(section.getByText("changed the priority", { exact: false })).toHaveTextContent(
      "Maya Okafor changed the priority from Low to High",
    );
    expect(section.getByRole("link", { name: "Late invoice" })).toHaveAttribute(
      "href",
      "/app/requests/late",
    );
  });

  it("says when nothing needs attention", () => {
    mocks.requests = ok([request({ id: "fine", title: "On track" })], { dataUpdatedAt: NOW });
    render(<DashboardView />);

    expect(screen.getByText("Nothing needs attention right now.")).toBeInTheDocument();
  });

  it("folds a long attention list and expands it on request", async () => {
    const user = userEvent.setup();
    mocks.requests = ok(
      Array.from({ length: 10 }, (_, index) =>
        request({ id: `u${index}`, title: `Unowned ${index}`, assigneeId: null }),
      ),
      { dataUpdatedAt: NOW },
    );
    render(<DashboardView />);
    const section = within(screen.getByRole("region", { name: "Needs attention" }));

    expect(section.getAllByRole("link")).toHaveLength(8);
    await user.click(section.getByRole("button", { name: "Show all 10" }));

    expect(section.getAllByRole("link")).toHaveLength(10);
    expect(section.getByRole("button", { name: "Show fewer" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("shows a loading state while data arrives", () => {
    mocks.requests = { ...ok(undefined), isPending: true };
    render(<DashboardView />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading requests");
  });

  it("explains a loading failure and retries only what failed", async () => {
    const user = userEvent.setup();
    mocks.settings = { ...ok(undefined), isError: true };
    render(<DashboardView />);

    expect(screen.getByRole("alert")).toHaveTextContent("The dashboard could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalledTimes(1);
  });
});
