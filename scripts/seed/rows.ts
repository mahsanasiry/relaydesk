import type { SeedPlan } from "./plan.ts";

export type Row = Record<string, unknown>;

export interface SeedIds {
  workspace: string;
  members: Record<string, string>;
  clients: Record<string, string>;
  projects: Record<string, string>;
  requests: Record<string, string>;
  comments: Record<string, string>;
}

export interface SeedRows {
  workspace: Row;
  clients: Row[];
  projects: Row[];
  requests: Row[];
  relations: Row[];
  comments: Row[];
  activity: Row[];
  notifications: Row[];
}

function lookup(table: Record<string, string>, key: string, kind: string): string {
  const value = table[key];
  if (value === undefined) {
    throw new Error(`Unknown ${kind} "${key}"`);
  }
  return value;
}

function optionalId(
  table: Record<string, string>,
  key: string | null,
  kind: string,
): string | null {
  return key === null ? null : lookup(table, key, kind);
}

// Member ids come from the auth service, everything else is generated here.
export function allocateIds(
  plan: SeedPlan,
  known: { workspace: string; members: Record<string, string> },
  generateId: () => string,
): SeedIds {
  const allocate = (keys: string[]): Record<string, string> =>
    Object.fromEntries(keys.map((key) => [key, generateId()]));

  return {
    workspace: known.workspace,
    members: known.members,
    clients: allocate(plan.clients.map((client) => client.key)),
    projects: allocate(plan.projects.map((project) => project.key)),
    requests: allocate(plan.requests.map((request) => request.key)),
    comments: allocate(plan.comments.map((comment) => comment.key)),
  };
}

export function buildRows(plan: SeedPlan, ids: SeedIds): SeedRows {
  const workspaceId = ids.workspace;
  const titles = Object.fromEntries(plan.requests.map((request) => [request.key, request.title]));

  return {
    workspace: {
      id: workspaceId,
      name: plan.workspace.name,
      waiting_threshold_days: plan.workspace.waitingThresholdDays,
      due_window_days: plan.workspace.dueWindowDays,
    },
    clients: plan.clients.map((client) => ({
      id: lookup(ids.clients, client.key, "client"),
      workspace_id: workspaceId,
      name: client.name,
      contact_name: client.contactName,
      contact_email: client.contactEmail,
      contact_phone: client.contactPhone,
      notes: client.notes,
      created_at: client.createdAt,
    })),
    projects: plan.projects.map((project) => ({
      id: lookup(ids.projects, project.key, "project"),
      workspace_id: workspaceId,
      client_id: optionalId(ids.clients, project.clientKey, "client"),
      name: project.name,
      description: project.description,
      status: project.status,
      start_date: project.startDate,
      end_date: project.endDate,
      created_at: project.createdAt,
    })),
    requests: plan.requests.map((request) => ({
      id: lookup(ids.requests, request.key, "request"),
      workspace_id: workspaceId,
      project_id: lookup(ids.projects, request.projectKey, "project"),
      client_id: optionalId(ids.clients, request.clientKey, "client"),
      title: request.title,
      description: request.description,
      status: request.status,
      priority: request.priority,
      assignee_id: optionalId(ids.members, request.assigneeKey, "member"),
      created_by: lookup(ids.members, request.createdByKey, "member"),
      due_date: request.dueDate,
      labels: request.labels,
      blocked_reason: request.blockedReason,
      blocked_note: request.blockedNote,
      status_changed_at: request.statusChangedAt,
      created_at: request.createdAt,
      updated_at: request.updatedAt,
    })),
    // Pairs are stored once, ordered by id, which is what the table constraint expects.
    relations: plan.relations.map((relation) => {
      const first = lookup(ids.requests, relation.firstKey, "request");
      const second = lookup(ids.requests, relation.secondKey, "request");
      const [lower, higher] = first < second ? [first, second] : [second, first];
      return {
        workspace_id: workspaceId,
        request_id: lower,
        related_request_id: higher,
        created_at: relation.createdAt,
      };
    }),
    comments: plan.comments.map((comment) => ({
      id: lookup(ids.comments, comment.key, "comment"),
      workspace_id: workspaceId,
      request_id: lookup(ids.requests, comment.requestKey, "request"),
      author_id: lookup(ids.members, comment.authorKey, "member"),
      body: comment.body,
      created_at: comment.createdAt,
    })),
    activity: plan.events.map((event) => ({
      workspace_id: workspaceId,
      request_id: lookup(ids.requests, event.requestKey, "request"),
      request_title: lookup(titles, event.requestKey, "request"),
      actor_id: lookup(ids.members, event.actorKey, "member"),
      type: event.type,
      metadata:
        event.commentKey === null
          ? event.metadata
          : { ...event.metadata, comment_id: lookup(ids.comments, event.commentKey, "comment") },
      created_at: event.createdAt,
    })),
    notifications: plan.notifications.map((notification) => ({
      workspace_id: workspaceId,
      user_id: lookup(ids.members, notification.userKey, "member"),
      type: notification.type,
      request_id: lookup(ids.requests, notification.requestKey, "request"),
      actor_id: optionalId(ids.members, notification.actorKey, "member"),
      read_at: notification.readAt,
      created_at: notification.createdAt,
    })),
  };
}
