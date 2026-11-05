import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Lists are shared by several screens, so a short freshness window avoids refetching
        // on every navigation while still picking up teammates' changes soon after.
        staleTime: 30_000,
        retry: 1,
      },
      // A retried mutation could create a request or comment twice.
      mutations: { retry: false },
    },
  });
}
