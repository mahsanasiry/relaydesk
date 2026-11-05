import { describe, expect, it } from "vitest";
import { BLOCKED_REASONS, REQUEST_STATUSES } from "../../features/requests/model.ts";
import { buildSeedPlan } from "../../../scripts/seed/plan.ts";
import { allocateIds, buildRows } from "../../../scripts/seed/rows.ts";

const NOW = new Date("2026-11-04T10:00:00Z");
const DAY = 24 * 60 * 60 * 1000;

function planForNow() {
  return buildSeedPlan(NOW);
}

describe("seed plan content", () => {
  it("contains more than forty requests spread over every status", () => {
    const plan = planForNow();

    expect(plan.requests.length).toBeGreaterThanOrEqual(40);
    for (const status of REQUEST_STATUSES) {
      expect(plan.requests.filter((request) => request.status === status).length).toBeGreaterThan(
        0,
      );
    }
  });

  it("covers every blocked reason", () => {
    const plan = planForNow();
    const reasons = new Set(plan.requests.map((request) => request.blockedReason));

    for (const reason of BLOCKED_REASONS) {
      expect(reasons.has(reason)).toBe(true);
    }
  });

  it("gives a blocked reason to blocked requests and to no others", () => {
    for (const request of planForNow().requests) {
      expect(request.status === "blocked").toBe(request.blockedReason !== null);
      if (request.status !== "blocked") {
        expect(request.blockedNote).toBe(null);
      }
    }
  });

  it("has projects that end after they start", () => {
    for (const project of planForNow().projects) {
      if (project.startDate !== null && project.endDate !== null) {
        expect(project.endDate >= project.startDate).toBe(true);
      }
    }
  });

  it("uses only fictional contact details", () => {
    const plan = planForNow();

    for (const person of [
      ...plan.members,
      ...plan.clients.map((c) => ({ email: c.contactEmail })),
    ]) {
      expect(person.email.endsWith(".example")).toBe(true);
    }
    for (const client of plan.clients) {
      expect(/^\+1 555 01\d\d$/.test(client.contactPhone)).toBe(true);
    }
  });
});

describe("seed plan consistency", () => {
  it("only refers to members, clients, projects and requests that exist", () => {
    const plan = planForNow();
    const memberKeys = new Set(plan.members.map((member) => member.key));
    const clientKeys = new Set(plan.clients.map((client) => client.key));
    const projectKeys = new Set(plan.projects.map((project) => project.key));
    const requestKeys = new Set(plan.requests.map((request) => request.key));

    for (const project of plan.projects) {
      expect(project.clientKey === null || clientKeys.has(project.clientKey)).toBe(true);
    }
    for (const request of plan.requests) {
      expect(projectKeys.has(request.projectKey)).toBe(true);
      expect(request.assigneeKey === null || memberKeys.has(request.assigneeKey)).toBe(true);
      expect(memberKeys.has(request.createdByKey)).toBe(true);
    }
    for (const comment of plan.comments) {
      expect(requestKeys.has(comment.requestKey)).toBe(true);
      expect(memberKeys.has(comment.authorKey)).toBe(true);
    }
    for (const event of plan.events) {
      expect(requestKeys.has(event.requestKey)).toBe(true);
      expect(memberKeys.has(event.actorKey)).toBe(true);
    }
    for (const notification of plan.notifications) {
      expect(requestKeys.has(notification.requestKey)).toBe(true);
      expect(memberKeys.has(notification.userKey)).toBe(true);
    }
  });

  it("derives a request's client from its project", () => {
    const plan = planForNow();
    const clientByProject = new Map(
      plan.projects.map((project) => [project.key, project.clientKey]),
    );

    for (const request of plan.requests) {
      expect(request.clientKey).toBe(clientByProject.get(request.projectKey));
    }
  });

  it("links each pair of requests once and never to themselves", () => {
    const plan = planForNow();
    const requestKeys = new Set(plan.requests.map((request) => request.key));
    const pairs = plan.relations.map((relation) =>
      [relation.firstKey, relation.secondKey].sort().join("|"),
    );

    expect(new Set(pairs).size).toBe(pairs.length);
    for (const relation of plan.relations) {
      expect(relation.firstKey === relation.secondKey).toBe(false);
      expect(requestKeys.has(relation.firstKey)).toBe(true);
      expect(requestKeys.has(relation.secondKey)).toBe(true);
    }
  });

  it("keeps every timestamp between creation and now", () => {
    const plan = planForNow();
    const now = NOW.toISOString();

    for (const request of plan.requests) {
      expect(request.createdAt <= request.statusChangedAt).toBe(true);
      expect(request.statusChangedAt <= request.updatedAt).toBe(true);
      expect(request.updatedAt <= now).toBe(true);
    }

    const createdAt = new Map(plan.requests.map((request) => [request.key, request.createdAt]));
    for (const event of plan.events) {
      expect(event.createdAt >= (createdAt.get(event.requestKey) ?? "")).toBe(true);
      expect(event.createdAt <= now).toBe(true);
    }
    for (const comment of plan.comments) {
      expect(comment.createdAt >= (createdAt.get(comment.requestKey) ?? "")).toBe(true);
    }
    for (const notification of plan.notifications) {
      expect(notification.createdAt <= now).toBe(true);
      expect(notification.readAt === null || notification.readAt <= now).toBe(true);
    }
  });

  it("starts every request's history with exactly one creation event", () => {
    const plan = planForNow();

    for (const request of plan.requests) {
      const created = plan.events.filter(
        (event) => event.requestKey === request.key && event.type === "request_created",
      );
      expect(created).toHaveLength(1);
    }
  });

  it("ends each status history on the request's current status", () => {
    const plan = planForNow();

    for (const request of plan.requests) {
      const changes = plan.events.filter(
        (event) => event.requestKey === request.key && event.type === "status_changed",
      );
      const last = changes.at(-1);

      if (request.status === "new") {
        expect(changes).toHaveLength(0);
      } else {
        expect(last?.metadata.to).toBe(request.status);
        expect(last?.createdAt).toBe(request.statusChangedAt);
      }
    }
  });

  it("records the reason on every move into Blocked", () => {
    for (const event of planForNow().events) {
      if (event.type === "status_changed" && event.metadata.to === "blocked") {
        expect(BLOCKED_REASONS.includes(event.metadata.blocked_reason as never)).toBe(true);
      }
    }
  });

  it("never notifies someone about their own action", () => {
    for (const notification of planForNow().notifications) {
      expect(notification.actorKey === notification.userKey).toBe(false);
    }
  });

  it("produces the same plan for the same day", () => {
    expect(buildSeedPlan(NOW)).toEqual(buildSeedPlan(new Date(NOW.getTime())));
  });

  it("moves due dates with the day the seed runs", () => {
    const later = buildSeedPlan(new Date(NOW.getTime() + 10 * DAY));
    const base = planForNow();

    base.requests.forEach((request, index) => {
      const shifted = later.requests[index];
      if (request.dueDate !== null && shifted?.dueDate) {
        const difference =
          (new Date(shifted.dueDate).getTime() - new Date(request.dueDate).getTime()) / DAY;
        expect(difference).toBe(10);
      }
    });
  });
});

describe("seed rows", () => {
  function buildAll() {
    const plan = planForNow();
    const memberIds = Object.fromEntries(
      plan.members.map((member, index) => [member.key, `member-${index}`]),
    );
    let counter = 0;
    const ids = allocateIds(plan, { workspace: "workspace-1", members: memberIds }, () => {
      counter += 1;
      return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
    });
    return { plan, ids, rows: buildRows(plan, ids) };
  }

  it("turns every key into an id and keeps one row per planned item", () => {
    const { plan, rows } = buildAll();

    expect(rows.requests).toHaveLength(plan.requests.length);
    expect(rows.comments).toHaveLength(plan.comments.length);
    expect(rows.activity).toHaveLength(plan.events.length);
    expect(rows.notifications).toHaveLength(plan.notifications.length);
  });

  it("stores each relation once with the lower id first", () => {
    const { rows } = buildAll();

    for (const relation of rows.relations) {
      expect(String(relation.request_id) < String(relation.related_request_id)).toBe(true);
    }
  });

  it("points comment activity at an inserted comment", () => {
    const { rows } = buildAll();
    const commentIds = new Set(rows.comments.map((comment) => comment.id));
    const commentEvents = rows.activity.filter((row) => row.type === "comment_added");

    expect(commentEvents).toHaveLength(rows.comments.length);
    for (const row of commentEvents) {
      const metadata = row.metadata as { comment_id: string };
      expect(commentIds.has(metadata.comment_id)).toBe(true);
    }
  });

  it("keeps the request title on activity rows", () => {
    const { rows } = buildAll();
    const titles = new Set(rows.requests.map((request) => request.title));

    for (const row of rows.activity) {
      expect(titles.has(row.request_title as string)).toBe(true);
    }
  });

  it("rejects a key that was never allocated", () => {
    const { plan, ids } = buildAll();
    const broken = { ...ids, projects: {} };

    expect(() => buildRows(plan, broken)).toThrow();
  });
});
