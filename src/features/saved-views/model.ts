import {
  DEFAULT_REQUEST_QUERY,
  parseRequestQuery,
  serializeRequestQuery,
} from "@/features/requests/filters";
import type { RequestQuery } from "@/features/requests/filters";

export const VIEW_NAME_MAX_LENGTH = 60;

export interface SavedView {
  id: string;
  name: string;
  query: string;
}

export interface ViewPreset {
  id: string;
  name: string;
  query: Partial<RequestQuery>;
}

/**
 * Built in, so they work before anything is saved. New accounts are given the same four views
 * as saved copies by the database, so a preset is only listed while no saved view has its
 * filters. Deleting a saved copy brings its preset back.
 */
export const VIEW_PRESETS: readonly ViewPreset[] = [
  {
    id: "my-open",
    name: "My Open Requests",
    query: {
      assignee: "me",
      statuses: ["new", "in_progress", "waiting", "blocked"],
    },
  },
  {
    id: "high-priority",
    name: "High Priority",
    query: { priorities: ["high"], statuses: ["new", "in_progress", "waiting", "blocked"] },
  },
  {
    id: "waiting-client",
    name: "Waiting for Client",
    query: { statuses: ["blocked"], blockedReason: "waiting_for_client" },
  },
  { id: "overdue", name: "Overdue", query: { overdueOnly: true } },
];

/** The canonical text for a set of filters, without the page, so equal views compare equal. */
export function canonicalViewQuery(query: RequestQuery): string {
  return serializeRequestQuery({ ...query, page: 1 });
}

export function visiblePresets(savedQueries: ReadonlySet<string>): ViewPreset[] {
  return VIEW_PRESETS.filter((preset) => !savedQueries.has(presetQuery(preset)));
}

export function presetQuery(preset: ViewPreset): string {
  return canonicalViewQuery({ ...DEFAULT_REQUEST_QUERY, ...preset.query });
}

/** Stored text is re-read and re-written so a view saved by an older version still matches. */
export function normalizeStoredQuery(stored: string): string {
  return canonicalViewQuery(parseRequestQuery(new URLSearchParams(stored)));
}

export function viewHref(canonicalQuery: string): string {
  return canonicalQuery ? `/app/requests?${canonicalQuery}` : "/app/requests";
}

export function isActiveView(current: RequestQuery, canonicalQuery: string): boolean {
  return canonicalViewQuery(current) === canonicalQuery;
}

/** Only a filtered list is worth saving. The unfiltered list is already one click away. */
export function canSaveView(current: RequestQuery): boolean {
  return canonicalViewQuery(current) !== "";
}

/** Returns a message for a name that cannot be used, or null. */
export function validateViewName(
  name: string,
  existing: readonly Pick<SavedView, "id" | "name">[],
  ignoreId?: string,
): string | null {
  const trimmed = name.trim();
  if (trimmed === "") return "Enter a name for this view.";
  if (trimmed.length > VIEW_NAME_MAX_LENGTH) {
    return `Keep the name to ${VIEW_NAME_MAX_LENGTH} characters or fewer.`;
  }
  const taken = existing.some(
    (view) => view.id !== ignoreId && view.name.trim().toLowerCase() === trimmed.toLowerCase(),
  );
  return taken ? "You already have a view with that name." : null;
}
