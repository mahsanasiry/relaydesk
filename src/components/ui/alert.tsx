import type { ReactNode } from "react";

interface AlertProps {
  tone: "error" | "info";
  title?: string;
  children: ReactNode;
}

const tones = {
  error: "border-danger/40 bg-danger-soft text-danger",
  info: "border-border bg-surface text-foreground",
} as const;

// Errors interrupt a screen reader; informational notes wait their turn.
export function Alert({ tone, title, children }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-lg border p-3 text-sm ${tones[tone]}`}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <p>{children}</p>
    </div>
  );
}
