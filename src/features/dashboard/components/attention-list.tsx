"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PriorityBadge, StatusBadge } from "@/features/requests/components/badges";
import type { AttentionItem } from "../attention";
import type { SummaryRequest } from "../summary";

const INITIAL_COUNT = 8;

interface AttentionListProps {
  items: readonly AttentionItem<SummaryRequest>[];
  memberNames: ReadonlyMap<string, string>;
}

export function AttentionList({ items, memberNames }: AttentionListProps) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? items : items.slice(0, INITIAL_COUNT);

  return (
    <section aria-labelledby="attention-heading" className="space-y-3">
      <h2 id="attention-heading" className="text-xl font-bold">
        Needs attention
      </h2>

      {items.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-muted-foreground shadow-card">
          Nothing needs attention right now.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {items.length === 1 ? "1 request" : `${items.length} requests`}, each with the rules it
            breaks.
          </p>
          <ul className="space-y-3">
            {visible.map(({ request, reasons }) => (
              <li
                key={request.id}
                className="rounded-xl border border-l-4 border-border border-l-warning bg-surface p-4 shadow-card"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/app/requests/${request.id}`}
                    className="font-medium text-primary underline"
                  >
                    {request.title}
                  </Link>
                  <StatusBadge status={request.status} />
                  <PriorityBadge priority={request.priority} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {request.assigneeId === null
                    ? "Unassigned"
                    : (memberNames.get(request.assigneeId) ?? "Unknown member")}
                </p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {reasons.map((reason) => (
                    <li key={reason.rule}>{reason.message}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
          {items.length > INITIAL_COUNT ? (
            <Button
              variant="secondary"
              aria-expanded={expanded}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show fewer" : `Show all ${items.length}`}
            </Button>
          ) : null}
        </>
      )}
    </section>
  );
}
