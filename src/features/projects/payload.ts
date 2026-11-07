import type { ProjectFormValues } from "@/lib/validation/project";
import type { Project } from "./api";

export function emptyProjectValues(clientId = ""): ProjectFormValues {
  return {
    name: "",
    description: "",
    status: "planned",
    clientId,
    startDate: "",
    endDate: "",
  };
}

export function toProjectFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    description: project.description,
    status: project.status,
    clientId: project.clientId ?? "",
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
  };
}

export function toProjectRecord(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description,
    status: values.status,
    client_id: values.clientId || null,
    start_date: values.startDate || null,
    end_date: values.endDate || null,
  };
}
