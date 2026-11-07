import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SavedViews } from "@/features/saved-views/components/saved-views";
import { DEFAULT_REQUEST_QUERY } from "@/features/requests/filters";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  rename: vi.fn(),
  remove: vi.fn(),
  notify: vi.fn(),
  views: {} as Record<string, unknown>,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ notify: mocks.notify }),
}));
vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ id: "u1", displayName: "Ada", workspaceId: "w1" }),
}));
vi.mock("@/features/saved-views/queries", () => ({
  useSavedViews: () => mocks.views,
  useCreateSavedView: () => ({ mutateAsync: mocks.create, isPending: false }),
  useRenameSavedView: () => ({ mutateAsync: mocks.rename, isPending: false }),
  useDeleteSavedView: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

function setViews(data: { id: string; name: string; query: string }[]) {
  mocks.views = { data, isPending: false, isError: false };
}

beforeEach(() => {
  mocks.create.mockReset().mockResolvedValue(undefined);
  mocks.rename.mockReset().mockResolvedValue(undefined);
  mocks.remove.mockReset().mockResolvedValue(undefined);
  mocks.notify.mockReset();
  setViews([]);
});

const filtered = { ...DEFAULT_REQUEST_QUERY, priorities: ["high" as const] };

describe("SavedViews", () => {
  it("links the four presets to their filtered lists", () => {
    render(<SavedViews query={DEFAULT_REQUEST_QUERY} />);

    expect(screen.getByRole("link", { name: "My Open Requests" })).toHaveAttribute(
      "href",
      "/app/requests?status=open&assignee=me",
    );
    expect(screen.getByRole("link", { name: "Overdue" })).toHaveAttribute(
      "href",
      "/app/requests?due=overdue",
    );
    expect(screen.getByRole("link", { name: "High Priority" })).toHaveAttribute(
      "href",
      "/app/requests?status=open&priority=high",
    );
    expect(screen.getByRole("link", { name: "Waiting for Client" })).toBeInTheDocument();
  });

  it("marks the view that matches the current filters", () => {
    render(<SavedViews query={{ ...DEFAULT_REQUEST_QUERY, overdueOnly: true }} />);

    expect(screen.getByRole("link", { name: "Overdue" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "High Priority" })).not.toHaveAttribute("aria-current");
  });

  it("does not list a preset twice when a saved view already has its filters", () => {
    setViews([{ id: "v1", name: "Overdue", query: "due=overdue" }]);
    render(<SavedViews query={DEFAULT_REQUEST_QUERY} />);

    const presets = within(screen.getByRole("list", { name: "Preset views" }));
    expect(presets.queryByRole("link", { name: "Overdue" })).not.toBeInTheDocument();
    expect(
      within(screen.getByRole("list", { name: "Saved views" })).getByRole("link", {
        name: "Overdue",
      }),
    ).toBeInTheDocument();
  });

  it("offers to save only when filters are active", () => {
    const { unmount } = render(<SavedViews query={DEFAULT_REQUEST_QUERY} />);
    expect(screen.queryByLabelText("Save these filters as a view")).not.toBeInTheDocument();
    unmount();

    render(<SavedViews query={filtered} />);
    expect(screen.getByLabelText("Save these filters as a view")).toBeInTheDocument();
  });

  it("saves the current filters under a name", async () => {
    const user = userEvent.setup();
    render(<SavedViews query={filtered} />);

    await user.type(screen.getByLabelText("Save these filters as a view"), "Urgent work");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(mocks.create).toHaveBeenCalledWith({
      name: "Urgent work",
      query: "priority=high",
    });
    expect(mocks.notify).toHaveBeenCalledWith("success", "View saved.");
  });

  it("refuses an empty or repeated name without calling the server", async () => {
    const user = userEvent.setup();
    setViews([{ id: "v1", name: "Urgent work", query: "priority=high" }]);
    render(<SavedViews query={filtered} />);

    await user.click(screen.getByRole("button", { name: "Save view" }));
    expect(screen.getByText("Enter a name for this view.")).toBeInTheDocument();

    await user.type(screen.getByLabelText("Save these filters as a view"), "urgent WORK");
    await user.click(screen.getByRole("button", { name: "Save view" }));
    expect(screen.getByText("You already have a view with that name.")).toBeInTheDocument();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("lists saved views and applies them as links", () => {
    setViews([
      {
        id: "v1",
        name: "Client chasers",
        query: "reason=waiting_for_client&status=blocked",
      },
    ]);
    render(<SavedViews query={DEFAULT_REQUEST_QUERY} />);

    const list = within(screen.getByRole("list", { name: "Saved views" }));
    expect(list.getByRole("link", { name: "Client chasers" })).toHaveAttribute(
      "href",
      "/app/requests?status=blocked&reason=waiting_for_client",
    );
  });

  it("renames a view", async () => {
    const user = userEvent.setup();
    setViews([{ id: "v1", name: "Old", query: "priority=high" }]);
    render(<SavedViews query={DEFAULT_REQUEST_QUERY} />);

    await user.click(screen.getByRole("button", { name: "Rename Old" }));
    const field = screen.getByLabelText("New name for Old");
    await user.clear(field);
    await user.type(field, "New");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(mocks.rename).toHaveBeenCalledWith({ id: "v1", name: "New" });
    expect(mocks.notify).toHaveBeenCalledWith("success", "View renamed.");
  });

  it("deletes a view only after confirmation", async () => {
    const user = userEvent.setup();
    setViews([{ id: "v1", name: "Old", query: "priority=high" }]);
    render(<SavedViews query={DEFAULT_REQUEST_QUERY} />);

    await user.click(screen.getByRole("button", { name: "Delete Old" }));
    expect(mocks.remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Delete" }));

    expect(mocks.remove).toHaveBeenCalledWith("v1");
    expect(mocks.notify).toHaveBeenCalledWith("success", "View deleted.");
  });

  it("shows a readable message when saving fails", async () => {
    mocks.create.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<SavedViews query={filtered} />);

    await user.type(screen.getByLabelText("Save these filters as a view"), "Urgent");
    await user.click(screen.getByRole("button", { name: "Save view" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });
});
