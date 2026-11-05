"use client";

import { useEffect, useId, useRef } from "react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  busyLabel: string;
  busy: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  busyLabel,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // Escape must not dismiss a delete that is already running.
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-full max-w-sm rounded-lg border border-border bg-surface p-6 text-foreground backdrop:bg-black/50"
    >
      <h2 id={titleId} className="text-lg font-semibold">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm} loading={busy}>
          {busy ? busyLabel : confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
