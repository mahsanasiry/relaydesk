import { isOverdue } from "@/features/requests/due";
import { BLOCKED_REASONS, isOpenStatus } from "@/features/requests/model";
import type { BlockedReason } from "@/features/requests/model";
import { PROJECT_STATUSES } from "@/features/projects/model";
import type { ProjectStatus } from "@/features/projects/model";
import { findNeedsAttention } from "./attention";
import type { AttentionCandidate, AttentionItem, AttentionSettings } from "./attention";

export interface SummaryRequest extends AttentionCandidate {
  blockedReason: BlockedReason | null;
}

export interface SummaryProject {
  status: ProjectStatus;
}

export interface BlockedGroup<T> {
  reason: BlockedReason;
  count: number;
  requests: T[];
}

export interface DashboardSummary<T extends SummaryRequest> {
  openCount: number;
  overdueCount: number;
  waitingCount: number;
  assignedToMeCount: number;
  blockedByReason: BlockedGroup<T>[];
  projectStatusCounts: Record<ProjectStatus, number>;
  needsAttention: AttentionItem<T>[];
}

export interface DashboardInput<T extends SummaryRequest> {
  requests: readonly T[];
  projects: readonly SummaryProject[];
  currentUserId: string;
  settings: AttentionSettings;
  now: Date;
}

/** Every figure on the dashboard comes from this function, computed from the rows it is given. */
export function buildDashboardSummary<T extends SummaryRequest>(
  input: DashboardInput<T>,
): DashboardSummary<T> {
  const { projects, currentUserId, settings, now } = input;
  const active = input.requests.filter((request) => request.archivedAt === null);
  const open = active.filter((request) => isOpenStatus(request.status));

  const blockedByReason = BLOCKED_REASONS.map((reason) => {
    const requests = active.filter(
      (request) => request.status === "blocked" && request.blockedReason === reason,
    );
    return { reason, count: requests.length, requests };
  });

  const projectStatusCounts = Object.fromEntries(
    PROJECT_STATUSES.map((status) => [
      status,
      projects.filter((project) => project.status === status).length,
    ]),
  ) as Record<ProjectStatus, number>;

  return {
    openCount: open.length,
    overdueCount: open.filter((request) => isOverdue(request, now)).length,
    waitingCount: open.filter((request) => request.status === "waiting").length,
    assignedToMeCount: open.filter((request) => request.assigneeId === currentUserId).length,
    blockedByReason,
    projectStatusCounts,
    needsAttention: findNeedsAttention(active, settings, now),
  };
}
