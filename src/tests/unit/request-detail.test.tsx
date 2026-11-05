import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { RequestDetail } from "@/features/requests/components/request-detail";
import type { RequestDetail as RequestDetailData } from "@/features/requests/detail-api";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  notify: vi.fn(),
  refetch: vi.fn(),
  save: vi.fn(),
  remove: vi.fn(),
  detail: {} as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }));
vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock("@/features/members/queries", () => ({
  useMembers: () => ({
    data: [{ id: "m1", displayName: "Grace Hopper" }],
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  }),
}));
vi.mock("@/features/projects/queries", () => ({
  useProjects: () => ({ data: [], isPending: false, isError: false, refetch: mocks.refetch }),
}));
vi.mock("@/features/requests/detail-queries", () => ({
  useRequestDetail: () => mocks.detail,
  useUpdateRequest: () => ({ mutateAsync: mocks.save }),
  useDeleteRequest: () => ({ mutateAsync: mocks.remove, isPending: false }),
}));

// jsdom does not implement modal dialogs, so open and close are modelled by the attribute.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
});

const request: RequestDetailData = {
  id: "r1",
  title: "Fix login",
  description: "Users are locked out.",
  status: "blocked",
  priority: "high",
  assigneeId: null,
  projectId: null,
  clientId: null,
  dueDate: "2026-11-03",
  blockedReason: "technical_problem",
  blockedNote: "Vendor outage",
  labels: ["auth"],
  statusChangedAt: "2026-11-01T09:00:00Z",
  updatedAt: "2026-11-02T09:00:00Z",
  createdAt: "2026-10-20T09:00:00Z",
  createdBy: "m1",
  archivedAt: null,
};

function load(data: RequestDetailData | null) {
  mocks.detail = {
    data,
    isPending: false,
    isError: false,
    dataUpdatedAt: Date.parse("2026-11-04T10:00:00Z"),
    refetch: mocks.refetch,
  };
}

beforeEach(() => {
  Object.values(mocks).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  });
  mocks.save.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  load(request);
});

describe("RequestDetail", () => {
  it("shows the request, why it is blocked and who created it", () => {
    render(<RequestDetail requestId="r1" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Fix login");
    expect(screen.getByText("Blocked: Technical problem")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toHaveValue("Fix login");
    expect(screen.getByLabelText("Reason")).toHaveValue("technical_problem");
    // The name also appears as an assignee option, so the check is scoped to the facts panel.
    const facts = within(screen.getByRole("complementary"));
    expect(facts.getByText("Grace Hopper")).toBeInTheDocument();
    expect(facts.getByText("Overdue by 1 day")).toBeInTheDocument();
  });

  it("explains when the request does not exist", () => {
    load(null);
    render(<RequestDetail requestId="r1" />);

    expect(screen.getByRole("heading", { name: "Request not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to requests" })).toHaveAttribute(
      "href",
      "/app/requests",
    );
  });

  it("offers a retry when loading fails", async () => {
    const user = userEvent.setup();
    mocks.detail = { ...mocks.detail, data: undefined, isError: true };
    render(<RequestDetail requestId="r1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("This request could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });

  it("saves edits and says so", async () => {
    const user = userEvent.setup();
    render(<RequestDetail requestId="r1" />);

    await user.type(screen.getByLabelText("Title"), " again");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ title: "Fix login again" }));
    expect(mocks.notify).toHaveBeenCalledWith("success", "Request saved.");
  });

  it("deletes only after confirmation, then returns to the list", async () => {
    const user = userEvent.setup();
    const { container } = render(<RequestDetail requestId="r1" />);

    await user.click(screen.getByRole("button", { name: "Delete request" }));
    const dialog = container.querySelector("dialog");
    expect(dialog).toHaveAttribute("open");
    expect(mocks.remove).not.toHaveBeenCalled();

    await user.click(within(dialog as HTMLElement).getByRole("button", { name: "Delete" }));

    expect(mocks.remove).toHaveBeenCalled();
    expect(mocks.notify).toHaveBeenCalledWith("success", "Request deleted.");
    expect(mocks.replace).toHaveBeenCalledWith("/app/requests");
  });

  it("keeps the request and explains the problem when deleting fails", async () => {
    mocks.remove.mockRejectedValue(new Error("Could not delete", { cause: { code: "42501" } }));
    const user = userEvent.setup();
    const { container } = render(<RequestDetail requestId="r1" />);

    await user.click(screen.getByRole("button", { name: "Delete request" }));
    await user.click(
      within(container.querySelector("dialog") as HTMLElement).getByRole("button", {
        name: "Delete",
      }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to do that.",
    );
    expect(mocks.replace).not.toHaveBeenCalled();
    expect(container.querySelector("dialog")).not.toHaveAttribute("open");
  });
});
