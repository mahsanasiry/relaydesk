import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestRow } from "@/features/requests/api";
import { RequestsView } from "@/features/requests/components/requests-view";

const NOW = Date.parse("2026-11-04T10:00:00Z");

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refetch: vi.fn(),
  search: new URLSearchParams(),
  requests: {} as Record<string, unknown>,
  members: {} as Record<string, unknown>,
  projects: {} as Record<string, unknown>,
  bulk: vi.fn(),
  notify: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/app/requests",
  useSearchParams: () => mocks.search,
}));
vi.mock("@/features/requests/queries", () => ({
  useRequests: () => mocks.requests,
}));
vi.mock("@/features/members/queries", () => ({
  useMembers: () => mocks.members,
}));
vi.mock("@/features/projects/queries", () => ({
  useProjects: () => mocks.projects,
}));
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ notify: mocks.notify }),
}));
vi.mock("@/features/requests/bulk-queries", () => ({
  useBulkUpdateRequests: () => ({ mutateAsync: mocks.bulk }),
}));
vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ id: "me-id", displayName: "Ada" }),
}));

function request(overrides: Partial<RequestRow> = {}): RequestRow {
  return {
    id: "r1",
    title: "Fix login",
    status: "in_progress",
    priority: "medium",
    assigneeId: null,
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

function load(data: RequestRow[]) {
  mocks.requests = {
    data,
    isPending: false,
    isError: false,
    dataUpdatedAt: NOW,
    refetch: mocks.refetch,
  };
}

function table() {
  return screen.getByRole("table");
}

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.refetch.mockReset();
  mocks.bulk.mockReset();
  mocks.notify.mockReset();
  mocks.search = new URLSearchParams();
  load([]);
  mocks.members = {
    data: [{ id: "m1", displayName: "Grace Hopper" }],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
  mocks.projects = {
    data: [{ id: "p1", name: "Website redesign", status: "active" }],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
});

describe("RequestsView", () => {
  it("shows what each request needs: status, blocked reason, owner and due date", () => {
    load([
      request({
        status: "blocked",
        blockedReason: "waiting_for_client",
        assigneeId: "m1",
        projectId: "p1",
        dueDate: "2026-11-03",
      }),
    ]);
    render(<RequestsView />);

    const view = within(table());
    expect(view.getByRole("link", { name: "Fix login" })).toHaveAttribute(
      "href",
      "/app/requests/r1",
    );
    expect(view.getByText("Blocked")).toBeInTheDocument();
    expect(view.getByText("Waiting for client")).toBeInTheDocument();
    expect(view.getByText("Grace Hopper")).toBeInTheDocument();
    expect(view.getByText("Website redesign")).toBeInTheDocument();
    expect(view.getByText("Overdue by 1 day")).toBeInTheDocument();
  });

  it("applies the filters found in the URL", () => {
    mocks.search = new URLSearchParams("status=blocked");
    load([
      request({
        id: "a",
        title: "Stuck one",
        status: "blocked",
        blockedReason: "technical_problem",
      }),
      request({ id: "b", title: "Moving one" }),
    ]);
    render(<RequestsView />);

    expect(within(table()).getByText("Stuck one")).toBeInTheDocument();
    expect(within(table()).queryByText("Moving one")).not.toBeInTheDocument();
    expect(screen.getByText("1 request")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Blocked" })).toBeChecked();
  });

  it("resolves the assignee filter 'me' to the signed-in user", () => {
    mocks.search = new URLSearchParams("assignee=me");
    load([
      request({ id: "a", title: "Mine", assigneeId: "me-id" }),
      request({ id: "b", title: "Theirs", assigneeId: "m1" }),
    ]);
    render(<RequestsView />);

    expect(within(table()).getByText("Mine")).toBeInTheDocument();
    expect(within(table()).queryByText("Theirs")).not.toBeInTheDocument();
  });

  it("writes a changed filter to the URL", async () => {
    const user = userEvent.setup();
    mocks.search = new URLSearchParams("status=blocked");
    load([request({ status: "blocked", blockedReason: "technical_problem" })]);
    render(<RequestsView />);

    await user.click(screen.getByRole("checkbox", { name: "Waiting" }));

    expect(mocks.replace).toHaveBeenCalledWith("/app/requests?status=waiting,blocked", {
      scroll: false,
    });
  });

  it("writes a search and a new sort order to the URL", async () => {
    const user = userEvent.setup();
    load([request()]);
    render(<RequestsView />);

    await user.type(screen.getByLabelText("Search titles"), "login");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(mocks.replace).toHaveBeenLastCalledWith("/app/requests?q=login", {
      scroll: false,
    });

    await user.selectOptions(screen.getByLabelText("Sort by"), "due");
    expect(mocks.replace).toHaveBeenLastCalledWith("/app/requests?sort=due", {
      scroll: false,
    });
  });

  it("offers a way out when filters match nothing", async () => {
    const user = userEvent.setup();
    mocks.search = new URLSearchParams("q=zzz");
    load([request()]);
    render(<RequestsView />);

    expect(screen.getByText("No requests match these filters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(mocks.replace).toHaveBeenCalledWith("/app/requests", {
      scroll: false,
    });
  });

  it("invites the first request when the workspace is empty", () => {
    render(<RequestsView />);

    expect(screen.getByText("No requests yet")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "New request" })).toHaveLength(2);
  });

  it("explains a loading failure and retries on request", async () => {
    const user = userEvent.setup();
    mocks.requests = { ...mocks.requests, data: undefined, isError: true };
    render(<RequestsView />);

    expect(screen.getByRole("alert")).toHaveTextContent("Requests could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("shows a loading state while data arrives", () => {
    mocks.requests = { ...mocks.requests, data: undefined, isPending: true };
    render(<RequestsView />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading requests");
  });

  it("splits long lists into pages that are linked, not stored in state", () => {
    load(
      Array.from({ length: 25 }, (_, index) =>
        request({
          id: `r${String(index).padStart(2, "0")}`,
          title: `Request ${index}`,
          updatedAt: new Date(NOW - index * 60_000).toISOString(),
        }),
      ),
    );
    const { unmount } = render(<RequestsView />);

    expect(screen.getByText("25 requests")).toBeInTheDocument();
    expect(within(table()).getAllByRole("row")).toHaveLength(21);
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/app/requests?page=2",
    );
    unmount();

    mocks.search = new URLSearchParams("page=2");
    render(<RequestsView />);

    expect(within(table()).getAllByRole("row")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/app/requests");
  });

  it("selects rows and shows how many are selected", async () => {
    const user = userEvent.setup();
    load([request({ id: "a", title: "First" }), request({ id: "b", title: "Second" })]);
    render(<RequestsView />);

    expect(screen.queryByRole("region", { name: "Bulk actions" })).not.toBeInTheDocument();
    await user.click(within(table()).getByRole("checkbox", { name: "Select First" }));

    expect(screen.getByRole("region", { name: "Bulk actions" })).toHaveTextContent("1 selected");

    await user.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
    expect(screen.getByText("2 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
    expect(screen.queryByRole("region", { name: "Bulk actions" })).not.toBeInTheDocument();
  });

  it("applies a bulk change to the selected rows only, then clears the selection", async () => {
    const user = userEvent.setup();
    mocks.bulk.mockResolvedValue(1);
    load([request({ id: "a", title: "First" }), request({ id: "b", title: "Second" })]);
    render(<RequestsView />);

    await user.click(within(table()).getByRole("checkbox", { name: "Select First" }));
    await user.selectOptions(screen.getByLabelText("Action"), "priority");
    await user.selectOptions(screen.getByLabelText("New priority"), "high");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(mocks.bulk).toHaveBeenCalledWith({
      ids: ["a"],
      patch: { priority: "high" },
    });
    expect(mocks.notify).toHaveBeenCalledWith("success", "1 request updated.");
    expect(screen.queryByRole("region", { name: "Bulk actions" })).not.toBeInTheDocument();
  });
});
