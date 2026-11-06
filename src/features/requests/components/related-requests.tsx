"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import { describeDataError } from "@/lib/errors";
import { DEFAULT_REQUEST_QUERY, filterRequests } from "../filters";
import { useRequests } from "../queries";
import { useAddRelation, useRelatedRequests, useRemoveRelation } from "../relations-queries";
import { StatusBadge } from "./badges";

const MAX_CHOICES = 20;

export function RelatedRequests({ requestId }: { requestId: string }) {
  const user = useCurrentUser();
  const { notify } = useToast();
  const related = useRelatedRequests(requestId);
  const requests = useRequests();
  const add = useAddRelation(requestId, user.workspaceId);
  const remove = useRemoveRelation(requestId);
  const [search, setSearch] = useState("");
  const [chosen, setChosen] = useState("");
  const [error, setError] = useState<string | null>(null);

  const choices = useMemo(() => {
    if (!requests.data) return [];
    const linked = new Set((related.data ?? []).map((item) => item.id));
    const own = requestId.toLowerCase();
    const now = new Date(requests.dataUpdatedAt);
    return filterRequests(
      requests.data,
      { ...DEFAULT_REQUEST_QUERY, search },
      {
        currentUserId: user.id,
        now,
      },
    )
      .filter((item) => item.id !== own && !linked.has(item.id))
      .slice(0, MAX_CHOICES);
  }, [requests.data, requests.dataUpdatedAt, related.data, search, requestId, user.id]);

  async function link() {
    setError(null);
    try {
      await add.mutateAsync(chosen);
      setChosen("");
      notify("success", "Requests linked.");
    } catch (failure) {
      setError(describeDataError(failure));
    }
  }

  async function unlink(otherId: string) {
    setError(null);
    try {
      await remove.mutateAsync(otherId);
      notify("success", "Link removed.");
    } catch (failure) {
      setError(describeDataError(failure));
    }
  }

  return (
    <section aria-labelledby="related-heading" className="space-y-4">
      <h2 id="related-heading" className="text-lg font-semibold">
        Related requests
      </h2>

      {error ? <Alert tone="error">{error}</Alert> : null}

      {related.isError ? (
        <div className="space-y-3">
          <Alert tone="error">Related requests could not be loaded.</Alert>
          <Button variant="secondary" onClick={() => void related.refetch()}>
            Try again
          </Button>
        </div>
      ) : related.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading related requests...
        </p>
      ) : related.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing is linked to this request yet.</p>
      ) : (
        <ul className="space-y-2">
          {related.data.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/app/requests/${item.id}`} className="text-sm text-primary underline">
                  {item.title}
                </Link>
                <StatusBadge status={item.status} />
                {item.archived ? (
                  <span className="text-xs text-muted-foreground">Archived</span>
                ) : null}
              </div>
              <Button
                variant="secondary"
                aria-label={`Remove link to ${item.title}`}
                loading={remove.isPending && remove.variables === item.id}
                onClick={() => void unlink(item.id)}
              >
                {remove.isPending && remove.variables === item.id ? "Removing..." : "Remove"}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-3 rounded-lg border border-border bg-surface p-4">
        <div>
          <label htmlFor="link-search" className="block text-sm font-medium">
            Find a request to link
          </label>
          <input
            id="link-search"
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setChosen("");
            }}
            className="mt-1 block min-h-11 w-full rounded-md border border-border bg-background px-3 text-sm"
          />
        </div>
        <SelectField
          label="Request"
          value={chosen}
          onChange={(event) => setChosen(event.target.value)}
        >
          <option value="">
            {choices.length === 0 ? "No matching requests" : "Choose a request"}
          </option>
          {choices.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </SelectField>
        <Button
          variant="secondary"
          disabled={chosen === ""}
          loading={add.isPending}
          onClick={() => void link()}
        >
          {add.isPending ? "Linking..." : "Link request"}
        </Button>
      </div>
    </section>
  );
}
