import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClientDetail } from "@/features/clients/components/client-detail";
import { ClientsView } from "@/features/clients/components/clients-view";
import { ProjectDetail } from "@/features/projects/components/project-detail";
import { ProjectsView } from "@/features/projects/components/projects-view";

const ID_P1 = "11111111-1111-4111-8111-111111111111";
const ID_C1 = "22222222-2222-4222-8222-222222222222";

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  save: vi.fn(),
  notify: vi.fn(),
  projects: {} as Record<string, unknown>,
  clients: {} as Record<string, unknown>,
  requests: {} as Record<string, unknown>,
}));

vi.mock("@/components/ui/toast", () => ({
  useToast: () => ({ notify: mocks.notify }),
}));
vi.mock("@/features/projects/queries", () => ({
  useProjects: () => mocks.projects,
  useUpdateProject: () => ({ mutateAsync: mocks.save }),
}));
vi.mock("@/features/clients/queries", () => ({
  useClients: () => mocks.clients,
  useUpdateClient: () => ({ mutateAsync: mocks.save }),
}));
vi.mock("@/features/requests/queries", () => ({
  useRequests: () => mocks.requests,
}));

function ready(data: unknown) {
  return { data, isPending: false, isError: false, refetch: mocks.refetch };
}

const project = {
  id: ID_P1,
  name: "Website redesign",
  description: "",
  status: "active",
  clientId: ID_C1,
  startDate: "2026-11-01",
  endDate: null,
  createdAt: "2026-10-01T00:00:00Z",
};
const client = {
  id: ID_C1,
  name: "Northwind",
  contactName: "Ada Lovelace",
  contactEmail: "ada@northwind.example",
  contactPhone: "",
  notes: "",
  createdAt: "2026-10-01T00:00:00Z",
};

function request(id: string, title: string, status: string) {
  return {
    id,
    title,
    status,
    priority: "medium",
    assigneeId: null,
    projectId: ID_P1,
    clientId: ID_C1,
    dueDate: null,
    blockedReason: null,
    updatedAt: "2026-11-02T00:00:00Z",
    archivedAt: null,
  };
}

beforeEach(() => {
  mocks.refetch.mockReset();
  mocks.projects = ready([project]);
  mocks.clients = ready([client]);
  mocks.requests = ready([
    request("r1", "Fix header", "in_progress"),
    request("r2", "Old task", "done"),
  ]);
});

describe("ProjectsView", () => {
  it("lists projects with their client and the number of open requests", () => {
    render(<ProjectsView />);

    const table = screen.getByRole("table", { name: "Projects" });
    const row = within(table).getByRole("row", { name: /Website redesign/ });
    expect(within(row).getByText("Northwind")).toBeInTheDocument();
    expect(within(row).getByText("Active")).toBeInTheDocument();
    expect(within(row).getByText("1")).toBeInTheDocument();
  });

  it("explains an empty workspace", () => {
    mocks.projects = ready([]);
    render(<ProjectsView />);

    expect(screen.getByText("No projects yet")).toBeInTheDocument();
  });

  it("offers a retry when loading fails", () => {
    mocks.projects = { ...ready(undefined), isError: true };
    render(<ProjectsView />);

    expect(screen.getByRole("alert")).toHaveTextContent("Projects could not be loaded");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});

describe("ProjectDetail", () => {
  it("shows the project, its client and its requests", () => {
    render(<ProjectDetail projectId={ID_P1} />);

    expect(screen.getByRole("heading", { name: "Website redesign", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Northwind" })).toHaveAttribute(
      "href",
      `/app/clients/${ID_C1}`,
    );
    expect(screen.getByRole("link", { name: "Fix header" })).toBeInTheDocument();
    expect(screen.getByText("1 open of 2.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New request" })).toHaveAttribute(
      "href",
      `/app/requests/new?project=${ID_P1}`,
    );
  });

  it("says so when the project does not exist", () => {
    mocks.projects = ready([]);
    render(<ProjectDetail projectId={ID_P1} />);

    expect(screen.getByRole("heading", { name: "Project not found" })).toBeInTheDocument();
  });
});

describe("ClientsView", () => {
  it("lists clients with project and open request counts", () => {
    render(<ClientsView />);

    const table = screen.getByRole("table", { name: "Clients" });
    const row = within(table).getByRole("row", { name: /Northwind/ });
    expect(within(row).getByText("Ada Lovelace")).toBeInTheDocument();
    expect(within(row).getAllByText("1")).toHaveLength(2);
  });

  it("explains an empty workspace", () => {
    mocks.clients = ready([]);
    render(<ClientsView />);

    expect(screen.getByText("No clients yet")).toBeInTheDocument();
  });
});

describe("ClientDetail", () => {
  it("lists the client's projects and links to a new one", () => {
    render(<ClientDetail clientId={ID_C1} />);

    expect(screen.getByRole("heading", { name: "Northwind", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("1 open request")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Website redesign" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "New project" })).toHaveAttribute(
      "href",
      `/app/projects/new?client=${ID_C1}`,
    );
  });

  it("says so when the client does not exist", () => {
    mocks.clients = ready([]);
    render(<ClientDetail clientId={ID_C1} />);

    expect(screen.getByRole("heading", { name: "Client not found" })).toBeInTheDocument();
  });
});
