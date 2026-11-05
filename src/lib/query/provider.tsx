"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";
import { createQueryClient } from "./client";

export function QueryProvider({ children }: { children: ReactNode }) {
  // State, not a module constant: a shared client would leak data between users on the server.
  const [client] = useState(createQueryClient);
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
