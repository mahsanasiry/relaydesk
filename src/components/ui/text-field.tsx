import { useId } from "react";
import type { ComponentPropsWithRef } from "react";

interface TextFieldProps extends Omit<ComponentPropsWithRef<"input">, "id"> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextField({ label, error, hint, className, ...props }: TextFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1 block min-h-11 w-full rounded-lg border border-border bg-surface px-3 text-sm transition-colors hover:border-muted-foreground aria-invalid:border-danger ${className ?? ""}`.trim()}
        {...props}
      />
      {hint ? (
        <p id={hintId} className="mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="mt-1 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
