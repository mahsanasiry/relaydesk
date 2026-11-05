import { useId } from "react";
import type { ComponentPropsWithRef } from "react";

interface SelectFieldProps extends Omit<ComponentPropsWithRef<"select">, "id"> {
  label: string;
}

export function SelectField({ label, children, className, ...props }: SelectFieldProps) {
  const id = useId();

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <select
        id={id}
        className={`mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm ${className ?? ""}`.trim()}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
