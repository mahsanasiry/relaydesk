const requestDetail = (id: string) => ["requests", "detail", id] as const;

export const queryKeys = {
  requests: ["requests"] as const,
  // Everything about one request nests under its detail key, so saving or deleting the request
  // through the list key also refreshes or drops its comments, links and activity.
  requestDetail,
  requestComments: (id: string) => [...requestDetail(id), "comments"] as const,
  requestActivity: (id: string) => [...requestDetail(id), "activity"] as const,
  requestRelations: (id: string) => [...requestDetail(id), "relations"] as const,
  // Workspace-wide activity sits under the requests key as well, so any change made through
  // the list key refreshes it too.
  activity: ["requests", "activity"] as const,
  activityRecent: (limit: number) => ["requests", "activity", "recent", limit] as const,
  workspaceSettings: ["workspace", "settings"] as const,
  members: ["members"] as const,
  projects: ["projects"] as const,
};
