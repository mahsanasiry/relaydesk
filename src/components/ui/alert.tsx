import type { ReactNode } from "react";

interface AlertProps {
  tone: "error" | "info";
  title?: string;
  children: ReactNode;
}

const tones = {
  error: "border-danger text-danger",
  info: "border-border text-foreground",
} as const;

// Errors interrupt a screen reader; informational notes wait their turn.
export function Alert({ tone, title, children }: AlertProps) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-md border bg-surface p-3 text-sm ${tones[tone]}`}
    >
      {title ? <p className="font-medium">{title}</p> : null}
      <p>{children}</p>
    </div>
  );
}
