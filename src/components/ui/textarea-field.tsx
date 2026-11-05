import { useId } from "react";
import type { ComponentPropsWithRef } from "react";

interface TextareaFieldProps extends Omit<ComponentPropsWithRef<"textarea">, "id"> {
  label: string;
  error?: string | undefined;
  hint?: string;
}

export function TextareaField({ label, error, hint, className, ...props }: TextareaFieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-sm aria-invalid:border-danger ${className ?? ""}`.trim()}
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
