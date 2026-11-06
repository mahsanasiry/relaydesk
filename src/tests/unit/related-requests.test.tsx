import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RequestRow } from "@/features/requests/api";
import { RelatedRequests } from "@/features/requests/components/related-requests";

const mocks = vi.hoisted(() => ({
  notify: vi.fn(),
  refetch: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  related: {} as Record<string, unknown>,
  requests: {} as Record<string, unknown>,
}));

vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ id: "me-id", displayName: "Ada", workspaceId: "w1" }),
}));
vi.mock("@/features/requests/queries", () => ({ useRequests: () => mocks.requests }));
vi.mock("@/features/requests/relations-queries", () => ({
  useRelatedRequests: () => mocks.related,
  useAddRelation: () => ({ mutateAsync: mocks.add, isPending: false }),
  useRemoveRelation: () => ({ mutateAsync: mocks.remove, isPending: false, variables: undefined }),
}));

function row(id: string, title: string): RequestRow {
  return {
    id,
    title,
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
  };
}

function loadRelated(data: unknown[]) {
  mocks.related = { data, isPending: false, isError: false, refetch: mocks.refetch };
}

beforeEach(() => {
  Object.values(mocks).forEach((value) => {
    if (typeof value === "function" && "mockReset" in value) value.mockReset();
  });
  mocks.add.mockResolvedValue(undefined);
  mocks.remove.mockResolvedValue(undefined);
  mocks.requests = {
    data: [
      row("r1", "This request"),
      row("r2", "Already linked"),
      row("r3", "Alpha invoice"),
      row("r4", "Zeta migration"),
    ],
    dataUpdatedAt: Date.parse("2026-11-04T10:00:00Z"),
  };
  loadRelated([{ id: "r2", title: "Already linked", status: "waiting", archived: false }]);
});

function optionNames() {
  return within(screen.getByLabelText("Request"))
    .getAllByRole("option")
    .map((option) => option.textContent);
}

describe("RelatedRequests", () => {
  it("lists linked requests with their status", () => {
    render(<RelatedRequests requestId="r1" />);

    expect(screen.getByRole("link", { name: "Already linked" })).toHaveAttribute(
      "href",
      "/app/requests/r2",
    );
    expect(screen.getByText("Waiting")).toBeInTheDocument();
  });

  it("says so when nothing is linked", () => {
    loadRelated([]);
    render(<RelatedRequests requestId="r1" />);

    expect(screen.getByText("Nothing is linked to this request yet.")).toBeInTheDocument();
  });

  it("removes a link and confirms", async () => {
    const user = userEvent.setup();
    render(<RelatedRequests requestId="r1" />);

    await user.click(screen.getByRole("button", { name: "Remove link to Already linked" }));

    expect(mocks.remove).toHaveBeenCalledWith("r2");
    expect(mocks.notify).toHaveBeenCalledWith("success", "Link removed.");
  });

  it("offers every request except this one and the ones already linked", () => {
    render(<RelatedRequests requestId="r1" />);

    expect(optionNames()).toEqual(["Choose a request", "Alpha invoice", "Zeta migration"]);
  });

  it("narrows the choices as the person types", async () => {
    const user = userEvent.setup();
    render(<RelatedRequests requestId="r1" />);

    await user.type(screen.getByLabelText("Find a request to link"), "zeta");

    expect(optionNames()).toEqual(["Choose a request", "Zeta migration"]);
  });

  it("links the chosen request", async () => {
    const user = userEvent.setup();
    render(<RelatedRequests requestId="r1" />);
    const button = screen.getByRole("button", { name: "Link request" });
    expect(button).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Request"), "r4");
    await user.click(button);

    expect(mocks.add).toHaveBeenCalledWith("r4");
    expect(mocks.notify).toHaveBeenCalledWith("success", "Requests linked.");
  });

  it("explains a failure", async () => {
    mocks.add.mockRejectedValue(new Error("Could not link", { cause: { code: "23505" } }));
    const user = userEvent.setup();
    render(<RelatedRequests requestId="r1" />);

    await user.selectOptions(screen.getByLabelText("Request"), "r3");
    await user.click(screen.getByRole("button", { name: "Link request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("That already exists.");
  });
});
