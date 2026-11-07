"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SelectField } from "@/components/ui/select-field";
import { TextField } from "@/components/ui/text-field";
import type { Member } from "@/features/members/queries";
import { describeDataError } from "@/lib/errors";
import { buildBulkPatch } from "../bulk";
import type { BulkAction, BulkPatch } from "../bulk";
import { BLOCKED_REASON_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "../labels";
import {
  BLOCKED_REASONS,
  REQUEST_PRIORITIES,
  REQUEST_STATUSES,
  isBlockedReason,
  isRequestPriority,
  isRequestStatus,
} from "../model";
import { BLOCKED_NOTE_MAX_LENGTH } from "../status-change";

type Kind = "" | BulkAction["kind"];

interface BulkBarProps {
  count: number;
  members: readonly Member[];
  /** Rejecting shows the failure in the bar. Resolving leaves the bar to its parent. */
  onApply: (action: BulkAction, patch: BulkPatch) => Promise<void>;
  onClear: () => void;
}

const UNASSIGNED = "none";

export function BulkBar({ count, members, onApply, onClear }: BulkBarProps) {
  const [kind, setKind] = useState<Kind>("");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  function chooseKind(next: string) {
    setKind(
      next === "status" || next === "priority" || next === "assignee" || next === "archive"
        ? next
        : "",
    );
    setValue("");
    setReason("");
    setNote("");
    setError(null);
  }

  function currentAction(): BulkAction | null {
    switch (kind) {
      case "status":
        return isRequestStatus(value)
          ? {
              kind,
              status: value,
              blockedReason: isBlockedReason(reason) ? reason : null,
              blockedNote: note,
            }
          : null;
      case "priority":
        return isRequestPriority(value) ? { kind, priority: value } : null;
      case "assignee":
        return value === "" ? null : { kind, assigneeId: value === UNASSIGNED ? null : value };
      case "archive":
        return { kind };
      default:
        return null;
    }
  }

  async function run() {
    const action = currentAction();
    if (!action) return;
    const built = buildBulkPatch(action, new Date());
    if (!built.ok) {
      setConfirming(false);
      setError(built.message);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onApply(action, built.patch);
      setConfirming(false);
      chooseKind("");
    } catch (failure) {
      setConfirming(false);
      setError(describeDataError(failure));
    } finally {
      setBusy(false);
    }
  }

  function apply() {
    if (kind === "archive") {
      setConfirming(true);
      return;
    }
    void run();
  }

  const ready = currentAction() !== null;
  const noun = count === 1 ? "1 request" : `${count} requests`;

  return (
    <section
      aria-label="Bulk actions"
      className="space-y-4 rounded-lg border border-primary bg-surface p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" className="font-medium">
          {count} selected
        </p>
        <Button variant="secondary" onClick={onClear} disabled={busy}>
          Clear selection
        </Button>
      </div>

      {error ? <Alert tone="error">{error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SelectField
          label="Action"
          value={kind}
          disabled={busy}
          onChange={(event) => chooseKind(event.target.value)}
        >
          <option value="">Choose an action</option>
          <option value="status">Change status</option>
          <option value="priority">Change priority</option>
          <option value="assignee">Change assignee</option>
          <option value="archive">Archive</option>
        </SelectField>

        {kind === "status" ? (
          <SelectField
            label="New status"
            value={value}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
          >
            <option value="">Choose a status</option>
            {REQUEST_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </SelectField>
        ) : null}

        {kind === "priority" ? (
          <SelectField
            label="New priority"
            value={value}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
          >
            <option value="">Choose a priority</option>
            {REQUEST_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </SelectField>
        ) : null}

        {kind === "assignee" ? (
          <SelectField
            label="New assignee"
            value={value}
            disabled={busy}
            onChange={(event) => setValue(event.target.value)}
          >
            <option value="">Choose a person</option>
            <option value={UNASSIGNED}>Unassigned</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.displayName}
              </option>
            ))}
          </SelectField>
        ) : null}
      </div>

      {kind === "status" && value === "blocked" ? (
        <fieldset className="grid gap-4 rounded-md border border-danger p-4 sm:grid-cols-2">
          <legend className="px-1 text-sm font-medium">Why are these blocked?</legend>
          <SelectField
            label="Reason"
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value)}
          >
            <option value="">Choose a reason</option>
            {BLOCKED_REASONS.map((item) => (
              <option key={item} value={item}>
                {BLOCKED_REASON_LABELS[item]}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Note (optional)"
            value={note}
            maxLength={BLOCKED_NOTE_MAX_LENGTH}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
          />
        </fieldset>
      ) : null}

      <Button onClick={apply} disabled={!ready} loading={busy && !confirming}>
        {busy && !confirming ? "Applying..." : "Apply"}
      </Button>

      <ConfirmDialog
        open={confirming}
        title={`Archive ${noun}?`}
        description="Archived requests leave every list and the dashboard. This does not delete them."
        confirmLabel="Archive"
        busyLabel="Archiving..."
        busy={busy}
        onConfirm={() => void run()}
        onCancel={() => setConfirming(false)}
      />
    </section>
  );
}
