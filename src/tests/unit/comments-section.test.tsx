import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommentsSection } from "@/features/comments/components/comments-section";

const mocks = vi.hoisted(() => ({
  notify: vi.fn(),
  refetch: vi.fn(),
  add: vi.fn(),
  comments: {} as Record<string, unknown>,
}));

vi.mock("@/components/ui/toast", () => ({ useToast: () => ({ notify: mocks.notify }) }));
vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({ id: "me-id", displayName: "Ada", workspaceId: "w1" }),
}));
vi.mock("@/features/members/queries", () => ({
  useMembers: () => ({ data: [{ id: "m1", displayName: "Grace Hopper" }] }),
}));
vi.mock("@/features/comments/queries", () => ({
  useComments: () => mocks.comments,
  useAddComment: () => ({ mutateAsync: mocks.add }),
}));

function load(data: unknown[]) {
  mocks.comments = { data, isPending: false, isError: false, refetch: mocks.refetch };
}

beforeEach(() => {
  mocks.notify.mockReset();
  mocks.refetch.mockReset();
  mocks.add.mockReset();
  mocks.add.mockResolvedValue(undefined);
  load([]);
});

describe("CommentsSection", () => {
  it("lists comments with who wrote them and when", () => {
    load([
      {
        id: "c1",
        authorId: "m1",
        body: "First line\nSecond line",
        createdAt: "2026-11-04T10:00:00Z",
      },
      {
        id: "c2",
        authorId: null,
        body: "From someone who left",
        createdAt: "2026-11-04T11:00:00Z",
      },
    ]);
    render(<CommentsSection requestId="r1" />);

    expect(screen.getByText("Grace Hopper")).toBeInTheDocument();
    expect(screen.getByText(/First line/)).toBeInTheDocument();
    expect(screen.getByText("2026-11-04 10:00 UTC")).toBeInTheDocument();
    expect(screen.getByText("Former member")).toBeInTheDocument();
  });

  it("says so when there are no comments", () => {
    render(<CommentsSection requestId="r1" />);

    expect(screen.getByText("No comments yet.")).toBeInTheDocument();
  });

  it("adds a comment, clears the box and confirms", async () => {
    const user = userEvent.setup();
    render(<CommentsSection requestId="r1" />);

    await user.type(screen.getByLabelText("Add a comment"), "  Nice work  ");
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    expect(mocks.add).toHaveBeenCalledWith("Nice work");
    expect(mocks.notify).toHaveBeenCalledWith("success", "Comment added.");
    expect(screen.getByLabelText("Add a comment")).toHaveValue("");
  });

  it("does not send an empty comment", async () => {
    const user = userEvent.setup();
    render(<CommentsSection requestId="r1" />);

    await user.click(screen.getByRole("button", { name: "Add comment" }));

    expect(await screen.findByText("Write a comment first.")).toBeInTheDocument();
    expect(mocks.add).not.toHaveBeenCalled();
  });

  it("keeps the text and explains the problem when sending fails", async () => {
    mocks.add.mockRejectedValue(new Error("Could not add", { cause: { code: "42501" } }));
    const user = userEvent.setup();
    render(<CommentsSection requestId="r1" />);

    await user.type(screen.getByLabelText("Add a comment"), "Nice work");
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to do that.",
    );
    expect(screen.getByLabelText("Add a comment")).toHaveValue("Nice work");
  });

  it("offers a retry when the comments cannot be loaded", async () => {
    mocks.comments = { data: undefined, isPending: false, isError: true, refetch: mocks.refetch };
    const user = userEvent.setup();
    render(<CommentsSection requestId="r1" />);

    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });
});
