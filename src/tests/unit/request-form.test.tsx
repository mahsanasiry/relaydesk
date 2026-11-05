import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RequestForm } from "@/features/requests/components/request-form";
import { emptyFormValues } from "@/features/requests/payload";

const onSubmit = vi.fn();
const members = [{ id: "m1", displayName: "Grace Hopper" }];
const projects = [{ id: "p1", name: "Website redesign", status: "active" as const }];

function renderForm() {
  return render(
    <RequestForm
      defaults={emptyFormValues()}
      members={members}
      projects={projects}
      submitLabel="Create request"
      savingLabel="Creating..."
      onSubmit={onSubmit}
    />,
  );
}

beforeEach(() => {
  onSubmit.mockReset();
  onSubmit.mockResolvedValue(undefined);
});

describe("RequestForm", () => {
  it("cannot be submitted until something changes", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Create request" })).toBeDisabled();
  });

  it("asks for a title instead of submitting without one", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Description"), "Some detail");
    await user.click(screen.getByRole("button", { name: "Create request" }));

    expect(await screen.findByText("Enter a title.")).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the values the person entered", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Title"), "Fix login");
    await user.selectOptions(screen.getByLabelText("Priority"), "high");
    await user.selectOptions(screen.getByLabelText("Assignee"), "m1");
    await user.click(screen.getByRole("button", { name: "Create request" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Fix login",
        priority: "high",
        assigneeId: "m1",
        status: "new",
      }),
    );
  });

  it("asks why a request is blocked, and only when it is", async () => {
    const user = userEvent.setup();
    renderForm();

    expect(screen.queryByLabelText("Reason")).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Title"), "Fix login");
    await user.selectOptions(screen.getByLabelText("Status"), "blocked");
    await user.click(screen.getByRole("button", { name: "Create request" }));

    expect(await screen.findByText("Choose why this request is blocked.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    await user.selectOptions(screen.getByLabelText("Reason"), "technical_problem");
    await user.type(screen.getByLabelText("Note (optional)"), "Vendor outage");
    await user.click(screen.getByRole("button", { name: "Create request" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "blocked",
        blockedReason: "technical_problem",
        blockedNote: "Vendor outage",
      }),
    );
  });

  it("shows a readable message when saving fails and keeps what was typed", async () => {
    onSubmit.mockRejectedValue(new Error("Could not save", { cause: { code: "42501" } }));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Title"), "Fix login");
    await user.click(screen.getByRole("button", { name: "Create request" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You do not have permission to do that.",
    );
    expect(screen.getByLabelText("Title")).toHaveValue("Fix login");
  });

  it("disables the button while saving", async () => {
    let finish: () => void = () => {};
    onSubmit.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Title"), "Fix login");
    await user.click(screen.getByRole("button", { name: "Create request" }));

    const busy = await screen.findByRole("button", { name: "Creating..." });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    finish();
  });
});
