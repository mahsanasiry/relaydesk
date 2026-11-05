export const queryKeys = {
  requests: ["requests"] as const,
  // Nested under the list key, so invalidating the list refreshes every open detail too.
  requestDetail: (id: string) => ["requests", "detail", id] as const,
  members: ["members"] as const,
  projects: ["projects"] as const,
};
