"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast";
import { useCurrentUser } from "@/features/auth/current-user";
import type { RequestQuery } from "@/features/requests/filters";
import { describeDataError } from "@/lib/errors";
import {
  VIEW_NAME_MAX_LENGTH,
  canSaveView,
  canonicalViewQuery,
  isActiveView,
  normalizeStoredQuery,
  presetQuery,
  validateViewName,
  viewHref,
  visiblePresets,
} from "../model";
import type { SavedView } from "../model";
import {
  useCreateSavedView,
  useDeleteSavedView,
  useRenameSavedView,
  useSavedViews,
} from "../queries";

const chip = "inline-flex min-h-11 items-center rounded-md border px-3 text-sm";

export function SavedViews({ query }: { query: RequestQuery }) {
  const user = useCurrentUser();
  const { notify } = useToast();
  const views = useSavedViews();
  const create = useCreateSavedView({
    workspaceId: user.workspaceId,
    userId: user.id,
  });
  const rename = useRenameSavedView();
  const remove = useDeleteSavedView();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<SavedView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const saved = useMemo(
    () =>
      (views.data ?? []).map((view) => ({
        view,
        canonical: normalizeStoredQuery(view.query),
      })),
    [views.data],
  );
  const existing = views.data ?? [];
  const presets = useMemo(
    () => visiblePresets(new Set(saved.map((item) => item.canonical))),
    [saved],
  );

  async function save() {
    const problem = validateViewName(name, existing);
    if (problem) {
      setNameError(problem);
      return;
    }
    setNameError(null);
    setError(null);
    try {
      await create.mutateAsync({ name, query: canonicalViewQuery(query) });
      notify("success", "View saved.");
      setName("");
    } catch (failure) {
      setError(describeDataError(failure));
    }
  }

  async function commitRename(view: SavedView) {
    const problem = validateViewName(renameValue, existing, view.id);
    if (problem) {
      setRenameError(problem);
      return;
    }
    setRenameError(null);
    setError(null);
    try {
      await rename.mutateAsync({ id: view.id, name: renameValue });
      notify("success", "View renamed.");
      setRenaming(null);
    } catch (failure) {
      setError(describeDataError(failure));
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setError(null);
    try {
      await remove.mutateAsync(deleting.id);
      notify("success", "View deleted.");
    } catch (failure) {
      setError(describeDataError(failure));
    } finally {
      setDeleting(null);
    }
  }

  const active = (canonical: string) => isActiveView(query, canonical);
  const link = (isActive: boolean) =>
    `${chip} ${isActive ? "border-primary bg-muted font-medium" : "border-border bg-surface"}`;

  return (
    <section aria-labelledby="views-heading" className="space-y-3">
      <h2 id="views-heading" className="text-sm font-medium">
        Views
      </h2>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <ul aria-label="Preset views" className="flex flex-wrap gap-2">
        {presets.map((preset) => {
          const canonical = presetQuery(preset);
          return (
            <li key={preset.id}>
              <Link
                href={viewHref(canonical)}
                aria-current={active(canonical) ? "true" : undefined}
                className={link(active(canonical))}
              >
                {preset.name}
              </Link>
            </li>
          );
        })}
      </ul>

      {views.isError ? (
        <p className="text-sm text-muted-foreground">Your saved views could not be loaded.</p>
      ) : saved.length > 0 ? (
        <ul aria-label="Saved views" className="space-y-2">
          {saved.map(({ view, canonical }) => (
            <li key={view.id} className="flex flex-wrap items-start gap-2">
              {renaming === view.id ? (
                <form
                  className="flex flex-wrap items-start gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void commitRename(view);
                  }}
                >
                  <TextField
                    label={`New name for ${view.name}`}
                    value={renameValue}
                    maxLength={VIEW_NAME_MAX_LENGTH}
                    error={renameError ?? undefined}
                    onChange={(event) => setRenameValue(event.target.value)}
                  />
                  <div className="flex gap-2 pt-6">
                    <Button type="submit" loading={rename.isPending}>
                      Save name
                    </Button>
                    <Button variant="secondary" onClick={() => setRenaming(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <Link
                    href={viewHref(canonical)}
                    aria-current={active(canonical) ? "true" : undefined}
                    className={link(active(canonical))}
                  >
                    {view.name}
                  </Link>
                  <Button
                    variant="secondary"
                    aria-label={`Rename ${view.name}`}
                    onClick={() => {
                      setRenaming(view.id);
                      setRenameValue(view.name);
                      setRenameError(null);
                    }}
                  >
                    Rename
                  </Button>
                  <Button
                    variant="secondary"
                    aria-label={`Delete ${view.name}`}
                    onClick={() => setDeleting(view)}
                  >
                    Delete
                  </Button>
                </>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {canSaveView(query) ? (
        <form
          className="flex flex-wrap items-start gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <TextField
            label="Save these filters as a view"
            value={name}
            maxLength={VIEW_NAME_MAX_LENGTH}
            error={nameError ?? undefined}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="pt-6">
            <Button type="submit" loading={create.isPending}>
              {create.isPending ? "Saving..." : "Save view"}
            </Button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title={`Delete "${deleting?.name ?? ""}"?`}
        description="The view is removed for you only. Requests are not affected."
        confirmLabel="Delete"
        busyLabel="Deleting..."
        busy={remove.isPending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}
