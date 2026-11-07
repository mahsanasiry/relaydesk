import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { NotificationsView } from "@/features/notifications/components/notifications-view";
import type { Notification } from "@/features/notifications/model";

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  markRead: vi.fn(),
  markAll: vi.fn(),
  notify: vi.fn(),
  list: {} as Record<string, unknown>,
  members: {} as Record<string, unknown>,
  unread: {} as Record<string, unknown>,
  markAllPending: false,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ notify: mocks.notify }),
}));
vi.mock("@/features/members/queries", () => ({
  useMembers: () => mocks.members,
}));
vi.mock("@/features/notifications/queries", () => ({
  useNotifications: () => mocks.list,
  useUnreadCount: () => mocks.unread,
  useMarkRead: () => ({ mutateAsync: mocks.markRead, isPending: false }),
  useMarkAllRead: () => ({
    mutateAsync: mocks.markAll,
    isPending: mocks.markAllPending,
  }),
}));

function notification(overrides: Partial<Notification> = {}): Notification {
  return {
    id: "n1",
    type: "comment_added",
    requestId: "r1",
    requestTitle: "Fix login",
    actorId: "m1",
    readAt: null,
    createdAt: "2026-11-04T10:00:00Z",
    ...overrides,
  };
}

function loaded(data: Notification[]) {
  mocks.list = {
    data,
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
}

beforeEach(() => {
  mocks.refetch.mockReset();
  mocks.markRead.mockReset();
  mocks.markRead.mockResolvedValue(undefined);
  mocks.markAll.mockReset();
  mocks.markAll.mockResolvedValue(undefined);
  mocks.notify.mockReset();
  mocks.markAllPending = false;
  loaded([]);
  mocks.members = {
    data: [{ id: "m1", displayName: "Grace Hopper" }],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
  mocks.unread = { data: 0 };
});

describe("NotificationsView", () => {
  it("shows what happened, to which request, and marks unread ones in words", () => {
    loaded([notification(), notification({ id: "n2", readAt: "2026-11-04T11:00:00Z" })]);
    render(<NotificationsView />);

    const [first, second, ...rest] = screen.getAllByRole("listitem");
    if (!first || !second) throw new Error("expected two notifications");
    expect(rest).toHaveLength(0);
    expect(within(first).getByText("Unread")).toBeInTheDocument();
    expect(within(first).getByText("Grace Hopper commented on this request.")).toBeInTheDocument();
    expect(within(first).getByRole("link", { name: "Fix login" })).toHaveAttribute(
      "href",
      "/app/requests/r1",
    );
    expect(within(second).queryByText("Unread")).not.toBeInTheDocument();
    expect(screen.getByText("1 unread.")).toBeInTheDocument();
  });

  it("marks one notification as read", async () => {
    const user = userEvent.setup();
    loaded([notification()]);
    render(<NotificationsView />);

    await user.click(screen.getByRole("button", { name: "Mark as read" }));

    expect(mocks.markRead).toHaveBeenCalledWith(["n1"]);
  });

  it("marks everything as read and says so", async () => {
    const user = userEvent.setup();
    loaded([notification(), notification({ id: "n2" })]);
    render(<NotificationsView />);

    await user.click(screen.getByRole("button", { name: "Mark all as read" }));

    expect(mocks.markAll).toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledWith("success", "All notifications marked as read.");
  });

  it("disables mark all when nothing is unread", () => {
    loaded([notification({ readAt: "2026-11-04T11:00:00Z" })]);
    render(<NotificationsView />);

    expect(screen.getByRole("button", { name: "Mark all as read" })).toBeDisabled();
    expect(screen.getByText("No unread notifications.")).toBeInTheDocument();
  });

  it("shows a readable message when marking fails", async () => {
    mocks.markRead.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    loaded([notification()]);
    render(<NotificationsView />);

    await user.click(screen.getByRole("button", { name: "Mark as read" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("explains an empty inbox", () => {
    render(<NotificationsView />);

    expect(screen.getByText("You are all caught up")).toBeInTheDocument();
  });

  it("explains a loading failure and retries on request", async () => {
    const user = userEvent.setup();
    mocks.list = {
      data: undefined,
      isPending: false,
      isError: true,
      refetch: mocks.refetch,
    };
    render(<NotificationsView />);

    expect(screen.getByRole("alert")).toHaveTextContent("Notifications could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });
});

describe("NotificationBell", () => {
  it("shows no badge when everything is read", () => {
    render(<NotificationBell />);

    expect(screen.getByRole("link", { name: "Notifications" })).toHaveAttribute(
      "href",
      "/app/notifications",
    );
  });

  it("puts the unread count in the accessible name", () => {
    mocks.unread = { data: 3 };
    render(<NotificationBell />);

    expect(screen.getByRole("link", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });
});
