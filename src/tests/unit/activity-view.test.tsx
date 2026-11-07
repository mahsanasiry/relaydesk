import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ActivityView } from "@/features/activity/components/activity-view";
import type { ActivityEvent } from "@/features/activity/model";

const ACTOR = "11111111-1111-4111-8111-111111111111";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refetch: vi.fn(),
  search: new URLSearchParams(),
  feed: {} as Record<string, unknown>,
  members: {} as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => "/app/activity",
  useSearchParams: () => mocks.search,
}));
vi.mock("@/features/activity/feed-queries", () => ({
  useActivityFeed: () => mocks.feed,
}));
vi.mock("@/features/members/queries", () => ({
  useMembers: () => mocks.members,
}));

function event(overrides: Partial<ActivityEvent> = {}): ActivityEvent {
  return {
    id: "e1",
    requestId: "r1",
    requestTitle: "Fix login",
    actorId: ACTOR,
    type: "comment_added",
    metadata: {},
    createdAt: "2026-11-04T10:00:00Z",
    ...overrides,
  };
}

function loaded(events: ActivityEvent[], total = events.length) {
  mocks.feed = {
    data: { events, total },
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
}

beforeEach(() => {
  mocks.replace.mockReset();
  mocks.refetch.mockReset();
  mocks.search = new URLSearchParams();
  loaded([]);
  mocks.members = {
    data: [{ id: ACTOR, displayName: "Grace Hopper" }],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
});

describe("ActivityView", () => {
  it("lists events with who did it and which request it was about", () => {
    loaded([event()]);
    render(<ActivityView />);

    // The name is also an option in the person filter, so the list is searched on its own.
    const list = within(screen.getByRole("list"));
    expect(list.getByText("Grace Hopper")).toBeInTheDocument();
    expect(list.getByText("added a comment", { exact: false })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Fix login" })).toHaveAttribute(
      "href",
      "/app/requests/r1",
    );
    expect(screen.getByText("1 event")).toBeInTheDocument();
  });

  it("writes a changed filter to the URL and returns to page one", async () => {
    const user = userEvent.setup();
    mocks.search = new URLSearchParams("page=3");
    loaded([event()], 100);
    render(<ActivityView />);

    await user.selectOptions(screen.getByLabelText("Show"), "comments");

    expect(mocks.replace).toHaveBeenCalledWith("/app/activity?type=comments", {
      scroll: false,
    });
  });

  it("writes the chosen person to the URL", async () => {
    const user = userEvent.setup();
    loaded([event()]);
    render(<ActivityView />);

    await user.selectOptions(screen.getByLabelText("Person"), ACTOR);

    expect(mocks.replace).toHaveBeenCalledWith(`/app/activity?actor=${ACTOR}`, {
      scroll: false,
    });
  });

  it("offers a way out when the filters match nothing", async () => {
    const user = userEvent.setup();
    mocks.search = new URLSearchParams("type=priority");
    render(<ActivityView />);

    expect(screen.getByText("No activity matches these filters")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(mocks.replace).toHaveBeenCalledWith("/app/activity", {
      scroll: false,
    });
  });

  it("explains an empty workspace", () => {
    render(<ActivityView />);

    expect(screen.getByText("Nothing has happened yet")).toBeInTheDocument();
  });

  it("links back from a page past the end", () => {
    mocks.search = new URLSearchParams("page=9");
    render(<ActivityView />);

    expect(screen.getByRole("link", { name: "Go to the first page" })).toHaveAttribute(
      "href",
      "/app/activity",
    );
  });

  it("links to neighbouring pages", () => {
    mocks.search = new URLSearchParams("type=comments&page=2");
    loaded([event()], 70);
    render(<ActivityView />);

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute(
      "href",
      "/app/activity?type=comments",
    );
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute(
      "href",
      "/app/activity?type=comments&page=3",
    );
  });

  it("explains a loading failure and retries on request", async () => {
    const user = userEvent.setup();
    mocks.feed = {
      data: undefined,
      isPending: false,
      isError: true,
      refetch: mocks.refetch,
    };
    render(<ActivityView />);

    expect(screen.getByRole("alert")).toHaveTextContent("The activity could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("shows a loading state while data arrives", () => {
    mocks.feed = {
      data: undefined,
      isPending: true,
      isError: false,
      refetch: mocks.refetch,
    };
    render(<ActivityView />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading requests");
  });
});
