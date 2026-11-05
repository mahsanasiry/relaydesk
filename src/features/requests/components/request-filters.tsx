"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import type { Member } from "@/features/members/queries";
import type { ProjectOption } from "@/features/projects/queries";
import { REQUEST_SORTS, SEARCH_MAX_LENGTH } from "../filters";
import type { RequestQuery, RequestSort } from "../filters";
import { BLOCKED_REASON_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "../labels";
import { BLOCKED_REASONS, REQUEST_PRIORITIES, REQUEST_STATUSES, isBlockedReason } from "../model";

const SORT_LABELS: Record<RequestSort, string> = {
  updated: "Recently updated",
  due: "Due date, earliest first",
};

interface RequestFiltersProps {
  query: RequestQuery;
  members: readonly Member[];
  projects: readonly ProjectOption[];
  onChange: (changes: Partial<Omit<RequestQuery, "page">>) => void;
}

function toggle<T extends string>(order: readonly T[], selected: readonly T[], value: T): T[] {
  return order.filter((item) =>
    item === value ? !selected.includes(item) : selected.includes(item),
  );
}

export function countActiveFilters(query: RequestQuery): number {
  return [
    query.statuses.length > 0,
    query.priorities.length > 0,
    query.assignee !== null,
    query.projectId !== null,
    query.blockedReason !== null,
    query.overdueOnly,
  ].filter(Boolean).length;
}

export function RequestFilters({ query, members, projects, onChange }: RequestFiltersProps) {
  const [open, setOpen] = useState(false);
  const active = countActiveFilters(query);

  return (
    <section aria-label="Filter requests" className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        {/* Keyed by the URL value so a search typed in the header shows up here too. */}
        <form
          key={query.search}
          className="flex min-w-0 flex-1 items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("q");
            onChange({ search: typeof value === "string" ? value.trim() : "" });
          }}
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="request-search" className="block text-sm font-medium">
              Search titles
            </label>
            <input
              id="request-search"
              name="q"
              type="search"
              defaultValue={query.search}
              maxLength={SEARCH_MAX_LENGTH}
              className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>
        <Button
          variant="secondary"
          className="md:hidden"
          aria-expanded={open}
          aria-controls="request-filter-panel"
          onClick={() => setOpen((value) => !value)}
        >
          {active > 0 ? `Filters (${active})` : "Filters"}
        </Button>
      </div>

      <div
        id="request-filter-panel"
        className={`${open ? "grid" : "hidden"} gap-4 rounded-lg border border-border bg-surface p-4 sm:grid-cols-2 md:grid lg:grid-cols-4`}
      >
        <fieldset>
          <legend className="text-sm font-medium">Status</legend>
          <div className="mt-1 space-y-1">
            {REQUEST_STATUSES.map((status) => (
              <label key={status} className="flex min-h-8 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={query.statuses.includes(status)}
                  onChange={() =>
                    onChange({ statuses: toggle(REQUEST_STATUSES, query.statuses, status) })
                  }
                />
                {STATUS_LABELS[status]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium">Priority</legend>
          <div className="mt-1 space-y-1">
            {REQUEST_PRIORITIES.map((priority) => (
              <label key={priority} className="flex min-h-8 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={query.priorities.includes(priority)}
                  onChange={() =>
                    onChange({ priorities: toggle(REQUEST_PRIORITIES, query.priorities, priority) })
                  }
                />
                {PRIORITY_LABELS[priority]}
              </label>
            ))}
          </div>
          <label className="mt-3 flex min-h-8 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={query.overdueOnly}
              onChange={(event) => onChange({ overdueOnly: event.target.checked })}
            />
            Overdue only
          </label>
        </fieldset>

        <div className="space-y-4">
          <SelectField
            label="Assignee"
            value={query.assignee ?? ""}
            onChange={(event) => onChange({ assignee: event.target.value || null })}
          >
            <option value="">Anyone</option>
            <option value="me">Me</option>
            <option value="unassigned">Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Project"
            value={query.projectId ?? ""}
            onChange={(event) => onChange({ projectId: event.target.value || null })}
          >
            <option value="">Any project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="space-y-4">
          <SelectField
            label="Blocked reason"
            value={query.blockedReason ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              onChange({ blockedReason: isBlockedReason(value) ? value : null });
            }}
          >
            <option value="">Any reason</option>
            {BLOCKED_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {BLOCKED_REASON_LABELS[reason]}
              </option>
            ))}
          </SelectField>
          <SelectField
            label="Sort by"
            value={query.sort}
            onChange={(event) => {
              const value = event.target.value;
              const sort = REQUEST_SORTS.find((item) => item === value);
              if (sort) onChange({ sort });
            }}
          >
            {REQUEST_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {SORT_LABELS[sort]}
              </option>
            ))}
          </SelectField>
        </div>
      </div>
    </section>
  );
}
