"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

type ToastTone = "success" | "error";

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  notify: (tone: ToastTone, message: string) => void;
}

const DISMISS_AFTER_MS = 6000;
const ToastContext = createContext<ToastApi | null>(null);
let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId++;
      setItems((current) => [...current, { id, tone, message }]);
      window.setTimeout(() => dismiss(id), DISMISS_AFTER_MS);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {/* The region stays mounted so screen readers announce messages added to it. */}
      <div
        role="status"
        aria-live="polite"
        className="fixed right-4 bottom-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-start justify-between gap-3 rounded-md border bg-surface p-3 text-sm shadow-md ${
              item.tone === "error" ? "border-danger" : "border-success"
            }`}
          >
            <p>
              <span className="font-medium">{item.tone === "error" ? "Error: " : "Done: "}</span>
              {item.message}
            </p>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="min-h-8 shrink-0 rounded-md px-2 text-muted-foreground hover:bg-muted"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(ToastContext);
  if (!api) {
    throw new Error("useToast must be used inside ToastProvider.");
  }
  return api;
}
