import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BulkBar } from "@/features/requests/components/bulk-bar";

const onApply = vi.fn();
const onClear = vi.fn();
const members = [{ id: "m1", displayName: "Grace Hopper" }];

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

beforeEach(() => {
  onApply.mockReset();
  onApply.mockResolvedValue(undefined);
  onClear.mockReset();
});

function renderBar(count = 2) {
  return render(<BulkBar count={count} members={members} onApply={onApply} onClear={onClear} />);
}

describe("BulkBar", () => {
  it("cannot apply until an action and its value are chosen", async () => {
    const user = userEvent.setup();
    renderBar();

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("Action"), "status");
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
    await user.selectOptions(screen.getByLabelText("New status"), "waiting");
    expect(screen.getByRole("button", { name: "Apply" })).toBeEnabled();
  });

  it("asks why when the new status is Blocked and refuses to continue without it", async () => {
    const user = userEvent.setup();
    renderBar();

    await user.selectOptions(screen.getByLabelText("Action"), "status");
    await user.selectOptions(screen.getByLabelText("New status"), "blocked");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByText("Choose why this request is blocked.")).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("Reason"), "technical_problem");
    await user.type(screen.getByLabelText("Note (optional)"), "Vendor outage");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "status", status: "blocked" }),
      {
        status: "blocked",
        blocked_reason: "technical_problem",
        blocked_note: "Vendor outage",
      },
    );
  });

  it("assigns to a person or to nobody", async () => {
    const user = userEvent.setup();
    renderBar();

    await user.selectOptions(screen.getByLabelText("Action"), "assignee");
    await user.selectOptions(screen.getByLabelText("New assignee"), "none");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledWith(
      { kind: "assignee", assigneeId: null },
      { assignee_id: null },
    );
  });

  it("asks for confirmation before archiving", async () => {
    const user = userEvent.setup();
    renderBar(3);

    await user.selectOptions(screen.getByLabelText("Action"), "archive");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Archive 3 requests?" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Archive" }));

    expect(onApply).toHaveBeenCalledWith(
      { kind: "archive" },
      { archived_at: expect.any(String) as string },
    );
  });

  it("shows a readable message when the update fails", async () => {
    onApply.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderBar();

    await user.selectOptions(screen.getByLabelText("Action"), "priority");
    await user.selectOptions(screen.getByLabelText("New priority"), "low");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("clears the selection on request", async () => {
    const user = userEvent.setup();
    renderBar();

    await user.click(screen.getByRole("button", { name: "Clear selection" }));

    expect(onClear).toHaveBeenCalled();
  });
});
