import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientForm } from "@/features/clients/components/client-form";
import { emptyClientValues } from "@/features/clients/payload";
import { ProjectForm } from "@/features/projects/components/project-form";
import { emptyProjectValues } from "@/features/projects/payload";

const onSubmit = vi.fn();
const clients = [
  {
    id: "c1",
    name: "Northwind",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    notes: "",
    createdAt: "2026-01-01T00:00:00Z",
  },
];

beforeEach(() => {
  onSubmit.mockReset();
  onSubmit.mockResolvedValue(undefined);
});

describe("ProjectForm", () => {
  function renderForm(clientId = "") {
    return render(
      <ProjectForm
        defaults={emptyProjectValues(clientId)}
        clients={clients}
        submitLabel="Create project"
        savingLabel="Creating..."
        onSubmit={onSubmit}
      />,
    );
  }

  it("cannot be submitted until something changes", () => {
    renderForm();

    expect(screen.getByRole("button", { name: "Create project" })).toBeDisabled();
  });

  it("preselects the client it was opened for", () => {
    renderForm("c1");

    expect(screen.getByLabelText("Client")).toHaveValue("c1");
  });

  it("rejects an end date before the start date", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Launch");
    await user.type(screen.getByLabelText("Start date"), "2026-12-01");
    await user.type(screen.getByLabelText("End date"), "2026-11-01");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(
      await screen.findByText("The end date must be on or after the start date."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the entered values", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Launch");
    await user.selectOptions(screen.getByLabelText("Client"), "c1");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Launch", clientId: "c1" }),
    );
  });

  it("shows a readable message when saving fails", async () => {
    onSubmit.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Launch");
    await user.click(screen.getByRole("button", { name: "Create project" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });
});

describe("ClientForm", () => {
  function renderForm() {
    return render(
      <ClientForm
        defaults={emptyClientValues()}
        submitLabel="Create client"
        savingLabel="Creating..."
        onSubmit={onSubmit}
      />,
    );
  }

  it("asks for a name", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Notes"), "Prefers email");
    await user.click(screen.getByRole("button", { name: "Create client" }));

    expect(screen.getByLabelText("Name")).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("rejects a malformed contact email", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Northwind");
    await user.type(screen.getByLabelText("Contact email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Create client" }));

    expect(screen.getByLabelText("Contact email")).toBeInvalid();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits the entered values", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText("Name"), "Northwind");
    await user.type(screen.getByLabelText("Contact email"), "ops@northwind.example");
    await user.click(screen.getByRole("button", { name: "Create client" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Northwind",
        contactEmail: "ops@northwind.example",
      }),
    );
  });
});
