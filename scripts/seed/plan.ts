import type { ProjectStatus } from "../../src/features/projects/model.ts";
import type {
  BlockedReason,
  RequestPriority,
  RequestStatus,
} from "../../src/features/requests/model.ts";
import {
  clients,
  comments,
  members,
  projects,
  relations,
  requests,
  WORKSPACE_SEED,
} from "./data.ts";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MIN_GAP = 5 * MINUTE;
const RECENT_COMMENT_DAYS = 3;
const RECENT_ASSIGNMENT_DAYS = 4;
const RECENT_UNBLOCK_DAYS = 4;

export type PlannedEventType =
  | "request_created"
  | "status_changed"
  | "assignee_changed"
  | "priority_changed"
  | "due_date_changed"
  | "comment_added";

export type PlannedNotificationType = "request_assigned" | "comment_added" | "request_unblocked";

export interface PlannedMember {
  key: string;
  name: string;
  email: string;
}

export interface PlannedClient {
  key: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
  createdAt: string;
}

export interface PlannedProject {
  key: string;
  clientKey: string | null;
  name: string;
  description: string;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
}

export interface PlannedRequest {
  key: string;
  title: string;
  description: string;
  projectKey: string;
  clientKey: string | null;
  status: RequestStatus;
  priority: RequestPriority;
  assigneeKey: string | null;
  createdByKey: string;
  dueDate: string | null;
  labels: string[];
  blockedReason: BlockedReason | null;
  blockedNote: string | null;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlannedRelation {
  firstKey: string;
  secondKey: string;
  createdAt: string;
}

export interface PlannedComment {
  key: string;
  requestKey: string;
  authorKey: string;
  body: string;
  createdAt: string;
}

export interface PlannedEvent {
  requestKey: string;
  actorKey: string;
  type: PlannedEventType;
  metadata: Record<string, unknown>;
  commentKey: string | null;
  createdAt: string;
}

export interface PlannedNotification {
  userKey: string;
  type: PlannedNotificationType;
  requestKey: string;
  actorKey: string | null;
  createdAt: string;
  readAt: string | null;
}

export interface SeedPlan {
  workspace: { name: string; waitingThresholdDays: number; dueWindowDays: number };
  members: PlannedMember[];
  clients: PlannedClient[];
  projects: PlannedProject[];
  requests: PlannedRequest[];
  relations: PlannedRelation[];
  comments: PlannedComment[];
  events: PlannedEvent[];
  notifications: PlannedNotification[];
}

interface Transition {
  from: RequestStatus;
  to: RequestStatus;
  at: number;
  actorKey: string;
  reason: BlockedReason | null;
  note: string | null;
}

// A stable per-label offset keeps timestamps from all landing on the same minute while
// making the output identical for a given `now`.
function jitterMinutes(label: string): number {
  let hash = 5381;
  for (const char of label) {
    hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  }
  return 60 + (hash % 540);
}

// Always at least an hour before `now`, so nothing generated is ever in the future.
function moment(now: Date, daysAgo: number, label: string): number {
  return now.getTime() - daysAgo * DAY - jitterMinutes(label) * MINUTE;
}

function notBefore(floor: number, time: number): number {
  return Math.max(time, floor + MIN_GAP);
}

function midpoint(start: number, end: number): number {
  return Math.floor((start + end) / 2);
}

// Due dates are plain dates. Using the UTC date matches how the database evaluates them.
function dateOnly(now: Date, offsetDays: number): string {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetDays),
  );
  return date.toISOString().slice(0, 10);
}

function iso(time: number): string {
  return new Date(time).toISOString();
}

function pick<T>(list: readonly T[], index: number): T {
  const item = list[index % list.length];
  if (item === undefined) {
    throw new Error("Cannot pick from an empty list");
  }
  return item;
}

function required<T>(value: T | undefined, description: string): T {
  if (value === undefined) {
    throw new Error(`Unknown ${description}`);
  }
  return value;
}

export function buildSeedPlan(now: Date): SeedPlan {
  const memberNames = new Map(members.map((member) => [member.key, member.name]));
  const projectClients = new Map(projects.map((project) => [project.key, project.clientKey]));
  const requestSeeds = new Map(requests.map((request) => [request.key, request]));

  const createdAtByRequest = new Map<string, number>();
  const creatorByRequest = new Map<string, string>();
  const events: PlannedEvent[] = [];
  const notifications: PlannedNotification[] = [];
  const drafts: Omit<PlannedRequest, "updatedAt">[] = [];

  const nameOf = (memberKey: string): string =>
    required(memberNames.get(memberKey), `member "${memberKey}"`);

  const addEvent = (
    requestKey: string,
    actorKey: string,
    type: PlannedEventType,
    at: number,
    metadata: Record<string, unknown> = {},
    commentKey: string | null = null,
  ): void => {
    events.push({ requestKey, actorKey, type, metadata, commentKey, createdAt: iso(at) });
  };

  const addNotification = (
    userKey: string,
    type: PlannedNotificationType,
    requestKey: string,
    actorKey: string | null,
    at: number,
  ): void => {
    const isOld = now.getTime() - at >= 2 * DAY;
    notifications.push({
      userKey,
      type,
      requestKey,
      actorKey,
      createdAt: iso(at),
      readAt: isOld ? iso(at + 2 * HOUR) : null,
    });
  };

  requests.forEach((seed, index) => {
    const creatorKey = pick(members, index).key;
    const ownerKey = seed.assigneeKey ?? creatorKey;
    const otherKey = pick(
      members.filter((member) => member.key !== ownerKey),
      index,
    ).key;

    const createdAt = moment(now, seed.createdAgo, `${seed.key}:created`);
    createdAtByRequest.set(seed.key, createdAt);
    creatorByRequest.set(seed.key, creatorKey);

    addEvent(seed.key, creatorKey, "request_created", createdAt, {
      status: "new",
      priority: seed.priorityWas ?? seed.priority,
    });

    if (seed.assigneeKey !== null && seed.assigneeKey !== creatorKey && index % 2 === 0) {
      addEvent(seed.key, creatorKey, "assignee_changed", createdAt + 20 * MINUTE, {
        from: null,
        to: nameOf(seed.assigneeKey),
      });
    }

    const transitions: Transition[] = [];
    const settledAt = notBefore(
      createdAt,
      moment(now, seed.statusAge ?? seed.createdAgo, `${seed.key}:status`),
    );

    if (seed.status === "in_progress" && seed.unblocked) {
      const blockedAt = notBefore(
        createdAt,
        moment(now, seed.unblocked.blockedAgo, `${seed.key}:blocked`),
      );
      transitions.push(
        {
          from: "new",
          to: "in_progress",
          at: notBefore(createdAt, midpoint(createdAt, blockedAt)),
          actorKey: ownerKey,
          reason: null,
          note: null,
        },
        {
          from: "in_progress",
          to: "blocked",
          at: blockedAt,
          actorKey: ownerKey,
          reason: seed.unblocked.reason,
          note: seed.unblocked.note,
        },
        {
          from: "blocked",
          to: "in_progress",
          at: notBefore(blockedAt, settledAt),
          actorKey: otherKey,
          reason: null,
          note: null,
        },
      );
    } else if (seed.status === "in_progress") {
      transitions.push({
        from: "new",
        to: "in_progress",
        at: settledAt,
        actorKey: ownerKey,
        reason: null,
        note: null,
      });
    } else if (seed.status !== "new") {
      transitions.push(
        {
          from: "new",
          to: "in_progress",
          at: notBefore(createdAt, midpoint(createdAt, settledAt)),
          actorKey: ownerKey,
          reason: null,
          note: null,
        },
        {
          from: "in_progress",
          to: seed.status,
          at: settledAt,
          actorKey: ownerKey,
          reason: seed.blocked?.reason ?? null,
          note: seed.blocked?.note ?? null,
        },
      );
    }

    for (const transition of transitions) {
      addEvent(seed.key, transition.actorKey, "status_changed", transition.at, {
        from: transition.from,
        to: transition.to,
        blocked_reason: transition.reason,
        blocked_note: transition.note,
      });
    }

    const statusChangedAt = transitions.at(-1)?.at ?? createdAt;

    if (seed.priorityWas !== undefined) {
      addEvent(
        seed.key,
        ownerKey,
        "priority_changed",
        notBefore(createdAt, midpoint(createdAt, now.getTime())),
        { from: seed.priorityWas, to: seed.priority },
      );
    }

    if (seed.dueWas !== undefined && seed.dueOffset !== null) {
      addEvent(
        seed.key,
        ownerKey,
        "due_date_changed",
        notBefore(createdAt, createdAt + Math.floor((now.getTime() - createdAt) / 3)),
        { from: dateOnly(now, seed.dueWas), to: dateOnly(now, seed.dueOffset) },
      );
    }

    if (
      seed.assigneeKey !== null &&
      seed.assigneeKey !== creatorKey &&
      seed.createdAgo <= RECENT_ASSIGNMENT_DAYS
    ) {
      addNotification(
        seed.assigneeKey,
        "request_assigned",
        seed.key,
        creatorKey,
        createdAt + 20 * MINUTE,
      );
    }

    if (
      seed.unblocked !== undefined &&
      seed.assigneeKey !== null &&
      now.getTime() - statusChangedAt <= RECENT_UNBLOCK_DAYS * DAY
    ) {
      addNotification(seed.assigneeKey, "request_unblocked", seed.key, otherKey, statusChangedAt);
    }

    drafts.push({
      key: seed.key,
      title: seed.title,
      description: seed.description,
      projectKey: seed.projectKey,
      clientKey: required(projectClients.get(seed.projectKey), `project "${seed.projectKey}"`),
      status: seed.status,
      priority: seed.priority,
      assigneeKey: seed.assigneeKey,
      createdByKey: creatorKey,
      dueDate: seed.dueOffset === null ? null : dateOnly(now, seed.dueOffset),
      labels: seed.labels,
      blockedReason: seed.blocked?.reason ?? null,
      blockedNote: seed.blocked?.note ?? null,
      statusChangedAt: iso(statusChangedAt),
      createdAt: iso(createdAt),
    });
  });

  const plannedComments: PlannedComment[] = [];
  const commentCounts = new Map<string, number>();

  for (const seed of comments) {
    const request = required(requestSeeds.get(seed.requestKey), `request "${seed.requestKey}"`);
    const requestCreatedAt = required(
      createdAtByRequest.get(seed.requestKey),
      `request "${seed.requestKey}"`,
    );
    const number = (commentCounts.get(seed.requestKey) ?? 0) + 1;
    commentCounts.set(seed.requestKey, number);

    const key = `${seed.requestKey}#${number}`;
    const at = notBefore(requestCreatedAt, moment(now, seed.ago, `${key}:comment`));

    plannedComments.push({
      key,
      requestKey: seed.requestKey,
      authorKey: seed.authorKey,
      body: seed.body,
      createdAt: iso(at),
    });
    addEvent(seed.requestKey, seed.authorKey, "comment_added", at, {}, key);

    if (seed.ago <= RECENT_COMMENT_DAYS) {
      const recipients = new Set<string>();
      if (request.assigneeKey !== null) {
        recipients.add(request.assigneeKey);
      }
      recipients.add(
        required(creatorByRequest.get(seed.requestKey), `request "${seed.requestKey}"`),
      );
      recipients.delete(seed.authorKey);
      for (const recipientKey of recipients) {
        addNotification(recipientKey, "comment_added", seed.requestKey, seed.authorKey, at);
      }
    }
  }

  events.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  notifications.sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const lastActivity = new Map<string, string>();
  for (const event of events) {
    lastActivity.set(event.requestKey, event.createdAt);
  }

  return {
    workspace: { ...WORKSPACE_SEED },
    members: members.map((member) => ({ ...member })),
    clients: clients.map((client) => ({
      ...client,
      createdAt: iso(moment(now, 200, `${client.key}:created`)),
    })),
    projects: projects.map((project) => ({
      key: project.key,
      clientKey: project.clientKey,
      name: project.name,
      description: project.description,
      status: project.status,
      startDate: project.startOffset === null ? null : dateOnly(now, project.startOffset),
      endDate: project.endOffset === null ? null : dateOnly(now, project.endOffset),
      createdAt: iso(moment(now, project.createdAgo, `${project.key}:created`)),
    })),
    requests: drafts.map((draft) => ({
      ...draft,
      updatedAt: required(lastActivity.get(draft.key), `request "${draft.key}"`),
    })),
    relations: relations.map((relation) => {
      const firstAt = required(
        createdAtByRequest.get(relation.first),
        `request "${relation.first}"`,
      );
      const secondAt = required(
        createdAtByRequest.get(relation.second),
        `request "${relation.second}"`,
      );
      return {
        firstKey: relation.first,
        secondKey: relation.second,
        createdAt: iso(Math.max(firstAt, secondAt) + 10 * MINUTE),
      };
    }),
    comments: plannedComments,
    events,
    notifications,
  };
}
