import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsView } from "@/features/settings/components/settings-view";

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  refetch: vi.fn(),
  notify: vi.fn(),
  saveName: vi.fn(),
  saveWorkspace: vi.fn(),
  workspace: {} as Record<string, unknown>,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}));
vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ notify: mocks.notify }),
}));
vi.mock("@/features/auth/current-user", () => ({
  useCurrentUser: () => ({
    id: "u1",
    displayName: "Ada Lovelace",
    workspaceId: "w1",
  }),
}));
vi.mock("@/features/settings/queries", () => ({
  useWorkspaceDetails: () => mocks.workspace,
  useUpdateWorkspace: () => ({ mutateAsync: mocks.saveWorkspace }),
  useUpdateDisplayName: () => ({ mutateAsync: mocks.saveName }),
}));

beforeEach(() => {
  mocks.refresh.mockReset();
  mocks.refetch.mockReset();
  mocks.notify.mockReset();
  mocks.saveName.mockReset().mockResolvedValue(undefined);
  mocks.saveWorkspace.mockReset().mockResolvedValue(undefined);
  mocks.workspace = {
    data: {
      id: "w1",
      name: "Fernhill Studio",
      waitingThresholdDays: 3,
      dueWindowDays: 2,
    },
    isPending: false,
    isError: false,
    refetch: mocks.refetch,
  };
});

describe("SettingsView", () => {
  it("shows the current values and keeps the email read-only", () => {
    render(<SettingsView email="ada@example.com" />);

    expect(screen.getByLabelText("Name")).toHaveValue("Ada Lovelace");
    expect(screen.getByLabelText("Email")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Workspace name")).toHaveValue("Fernhill Studio");
    expect(screen.getByLabelText("Waiting threshold (days)")).toHaveValue("3");
    expect(screen.getByLabelText("Due window (days)")).toHaveValue("2");
    expect(screen.getByRole("button", { name: "Save settings" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Save name" })).toBeDisabled();
  });

  it("saves a new name and refreshes the page chrome", async () => {
    const user = userEvent.setup();
    render(<SettingsView email="ada@example.com" />);

    const field = screen.getByLabelText("Name");
    await user.clear(field);
    await user.type(field, "Ada King");
    await user.click(screen.getByRole("button", { name: "Save name" }));

    expect(mocks.saveName).toHaveBeenCalledWith({ displayName: "Ada King" });
    expect(mocks.notify).toHaveBeenCalledWith("success", "Name saved.");
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("saves new thresholds", async () => {
    const user = userEvent.setup();
    render(<SettingsView email="ada@example.com" />);

    const field = screen.getByLabelText("Waiting threshold (days)");
    await user.clear(field);
    await user.type(field, "5");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(mocks.saveWorkspace).toHaveBeenCalledWith({
      name: "Fernhill Studio",
      waitingThresholdDays: "5",
      dueWindowDays: "2",
    });
    expect(mocks.notify).toHaveBeenCalledWith("success", "Settings saved.");
  });

  it("rejects a threshold outside the allowed range", async () => {
    const user = userEvent.setup();
    render(<SettingsView email="ada@example.com" />);

    const field = screen.getByLabelText("Due window (days)");
    await user.clear(field);
    await user.type(field, "99");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(field).toBeInvalid();
    expect(screen.getByText("Enter a whole number from 1 to 30.")).toBeInTheDocument();
    expect(mocks.saveWorkspace).not.toHaveBeenCalled();
  });

  it("shows a readable message when saving fails", async () => {
    mocks.saveWorkspace.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<SettingsView email="ada@example.com" />);

    const field = screen.getByLabelText("Workspace name");
    await user.type(field, " Two");
    await user.click(screen.getByRole("button", { name: "Save settings" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong");
  });

  it("offers a retry when the workspace cannot be loaded", async () => {
    const user = userEvent.setup();
    mocks.workspace = {
      data: undefined,
      isPending: false,
      isError: true,
      refetch: mocks.refetch,
    };
    render(<SettingsView email="ada@example.com" />);

    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(mocks.refetch).toHaveBeenCalled();
  });
});
