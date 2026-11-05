import { OPEN_STATUSES, REQUEST_PRIORITIES, REQUEST_STATUSES, isBlockedReason } from "./model";
import type { BlockedReason, RequestPriority, RequestStatus } from "./model";
import { isOverdue } from "./due";

export const REQUEST_SORTS = ["updated", "due"] as const;
export type RequestSort = (typeof REQUEST_SORTS)[number];

export const PAGE_SIZE = 20;
export const SEARCH_MAX_LENGTH = 200;
const MAX_PAGE = 10_000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * What the requests list shows. It lives in the URL, so every field has a plain text form
 * and anything unrecognised is dropped instead of breaking the page.
 */
export interface RequestQuery {
  search: string;
  statuses: RequestStatus[];
  priorities: RequestPriority[];
  /** "me", "unassigned" or a member id. */
  assignee: string | null;
  projectId: string | null;
  blockedReason: BlockedReason | null;
  overdueOnly: boolean;
  sort: RequestSort;
  page: number;
}

export const DEFAULT_REQUEST_QUERY: RequestQuery = {
  search: "",
  statuses: [],
  priorities: [],
  assignee: null,
  projectId: null,
  blockedReason: null,
  overdueOnly: false,
  sort: "updated",
  page: 1,
};

export type SearchParamsInput =
  | { getAll(name: string): string[] }
  | Readonly<Record<string, string | readonly string[] | undefined>>;

function readValues(source: SearchParamsInput, key: string): string[] {
  if ("getAll" in source && typeof source.getAll === "function") {
    return source.getAll(key);
  }
  const value = (source as Readonly<Record<string, string | readonly string[] | undefined>>)[key];
  if (value === undefined) {
    return [];
  }
  return typeof value === "string" ? [value] : [...value];
}

function readList(source: SearchParamsInput, key: string): string[] {
  return readValues(source, key)
    .flatMap((value) => value.split(","))
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token !== "");
}

function readSingle(source: SearchParamsInput, key: string): string | null {
  const value = readValues(source, key)[0]?.trim();
  return value ? value : null;
}

export function parseRequestQuery(source: SearchParamsInput): RequestQuery {
  const statusTokens = new Set(readList(source, "status"));
  if (statusTokens.has("open")) {
    for (const status of OPEN_STATUSES) {
      statusTokens.add(status);
    }
  }
  const priorityTokens = new Set(readList(source, "priority"));

  const assignee = readSingle(source, "assignee");
  const project = readSingle(source, "project");
  const reason = readSingle(source, "reason")?.toLowerCase() ?? null;
  const sort = readSingle(source, "sort")?.toLowerCase() ?? "";
  const page = Number.parseInt(readSingle(source, "page") ?? "", 10);

  return {
    search: (readSingle(source, "q") ?? "").slice(0, SEARCH_MAX_LENGTH),
    statuses: REQUEST_STATUSES.filter((status) => statusTokens.has(status)),
    priorities: REQUEST_PRIORITIES.filter((priority) => priorityTokens.has(priority)),
    assignee:
      assignee === "me" || assignee === "unassigned" || (assignee && UUID_PATTERN.test(assignee))
        ? assignee
        : null,
    projectId: project && UUID_PATTERN.test(project) ? project : null,
    blockedReason: reason !== null && isBlockedReason(reason) ? reason : null,
    overdueOnly: readSingle(source, "due")?.toLowerCase() === "overdue",
    sort: (REQUEST_SORTS as readonly string[]).includes(sort)
      ? (sort as RequestSort)
      : DEFAULT_REQUEST_QUERY.sort,
    page: Number.isInteger(page) && page >= 1 ? Math.min(page, MAX_PAGE) : 1,
  };
}

function statusParam(statuses: readonly RequestStatus[]): string {
  const isOpenSet =
    statuses.length === OPEN_STATUSES.length &&
    OPEN_STATUSES.every((status) => statuses.includes(status));
  return isOpenSet ? "open" : statuses.join(",");
}

function encodeValue(value: string): string {
  return encodeURIComponent(value).replace(/%2C/gi, ",");
}

/** The canonical query string: fixed parameter order, defaults left out, commas kept readable. */
export function serializeRequestQuery(query: RequestQuery): string {
  const pairs: [string, string][] = [];
  const search = query.search.trim();

  if (search) pairs.push(["q", search]);
  if (query.statuses.length > 0) pairs.push(["status", statusParam(query.statuses)]);
  if (query.priorities.length > 0) pairs.push(["priority", query.priorities.join(",")]);
  if (query.assignee) pairs.push(["assignee", query.assignee]);
  if (query.projectId) pairs.push(["project", query.projectId]);
  if (query.blockedReason) pairs.push(["reason", query.blockedReason]);
  if (query.overdueOnly) pairs.push(["due", "overdue"]);
  if (query.sort !== DEFAULT_REQUEST_QUERY.sort) pairs.push(["sort", query.sort]);
  if (query.page > 1) pairs.push(["page", String(query.page)]);

  return pairs.map(([key, value]) => `${key}=${encodeValue(value)}`).join("&");
}

/** Two query strings that describe the same view normalise to the same text. */
export function normalizeQueryString(raw: string): string {
  return serializeRequestQuery(parseRequestQuery(new URLSearchParams(raw)));
}

export function hasActiveFilters(query: RequestQuery): boolean {
  return (
    query.search.trim() !== "" ||
    query.statuses.length > 0 ||
    query.priorities.length > 0 ||
    query.assignee !== null ||
    query.projectId !== null ||
    query.blockedReason !== null ||
    query.overdueOnly
  );
}

/** Changing a filter or the sort order starts again from the first page. */
export function withFilters(
  query: RequestQuery,
  changes: Partial<Omit<RequestQuery, "page">>,
): RequestQuery {
  return { ...query, ...changes, page: 1 };
}

export function withPage(query: RequestQuery, page: number): RequestQuery {
  return { ...query, page: Math.max(1, Math.floor(page)) };
}

export interface FilterableRequest {
  id: string;
  title: string;
  status: RequestStatus;
  priority: RequestPriority;
  assigneeId: string | null;
  projectId: string | null;
  dueDate: string | null;
  blockedReason: BlockedReason | null;
  updatedAt: string;
  archivedAt: string | null;
}

export interface FilterContext {
  currentUserId: string;
  now: Date;
}

// Accents and case are ignored so "tomas" finds "Tomás".
function normalizeText(value: string): string {
  return value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase();
}

function matchesSearch(title: string, search: string): boolean {
  const tokens = normalizeText(search).split(/\s+/).filter(Boolean);
  const haystack = normalizeText(title);
  return tokens.every((token) => haystack.includes(token));
}

function matchesAssignee(request: FilterableRequest, assignee: string, userId: string): boolean {
  if (assignee === "unassigned") {
    return request.assigneeId === null;
  }
  return request.assigneeId === (assignee === "me" ? userId : assignee);
}

export function filterRequests<T extends FilterableRequest>(
  requests: readonly T[],
  query: RequestQuery,
  context: FilterContext,
): T[] {
  return requests.filter((request) => {
    if (request.archivedAt !== null) return false;
    if (query.search.trim() !== "" && !matchesSearch(request.title, query.search)) return false;
    if (query.statuses.length > 0 && !query.statuses.includes(request.status)) return false;
    if (query.priorities.length > 0 && !query.priorities.includes(request.priority)) return false;
    if (
      query.assignee !== null &&
      !matchesAssignee(request, query.assignee, context.currentUserId)
    ) {
      return false;
    }
    if (query.projectId !== null && request.projectId !== query.projectId) return false;
    if (query.blockedReason !== null && request.blockedReason !== query.blockedReason) {
      return false;
    }
    if (query.overdueOnly && !isOverdue(request, context.now)) return false;
    return true;
  });
}

function byUpdatedDesc(a: FilterableRequest, b: FilterableRequest): number {
  return Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || a.id.localeCompare(b.id);
}

function byDueAsc(a: FilterableRequest, b: FilterableRequest): number {
  if (a.dueDate !== b.dueDate) {
    if (a.dueDate === null) return 1;
    if (b.dueDate === null) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  return byUpdatedDesc(a, b);
}

/** Due date puts the earliest first and requests without one last. */
export function sortRequests<T extends FilterableRequest>(
  requests: readonly T[],
  sort: RequestSort,
): T[] {
  return [...requests].sort(sort === "due" ? byDueAsc : byUpdatedDesc);
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export function paginate<T>(items: readonly T[], page: number, pageSize = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, Math.floor(page)), pageCount);
  const start = (current - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: current,
    pageCount,
    total: items.length,
  };
}

/** Filter, sort and paginate in one step, which is how the list page uses a query. */
export function selectRequests<T extends FilterableRequest>(
  requests: readonly T[],
  query: RequestQuery,
  context: FilterContext,
): Page<T> {
  const matching = filterRequests(requests, query, context);
  return paginate(sortRequests(matching, query.sort), query.page);
}
