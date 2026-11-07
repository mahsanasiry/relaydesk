import type { SupabaseClient } from "@supabase/supabase-js";
import { isNotificationType } from "./model";
import type { Notification } from "./model";

interface NotificationRecord {
  id: string;
  type: string;
  request_id: string;
  actor_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const NOTIFICATION_LIMIT = 100;
const COLUMNS = "id,type,request_id,actor_id,read_at,created_at";

/**
 * Creates the "due soon" notifications that are owed right now. It is safe to call repeatedly:
 * the database ignores a notification it has already created for the same due date.
 */
export async function refreshDueNotifications(client: SupabaseClient): Promise<void> {
  const { error } = await client.rpc("refresh_due_notifications");
  if (error) {
    throw new Error("Could not check for upcoming due dates.", {
      cause: error,
    });
  }
}

export function mapNotifications(
  records: readonly NotificationRecord[],
  titles: ReadonlyMap<string, string>,
): Notification[] {
  const notifications: Notification[] = [];
  for (const record of records) {
    // A type this version does not know is skipped instead of breaking the page.
    if (!isNotificationType(record.type)) continue;
    notifications.push({
      id: record.id,
      type: record.type,
      requestId: record.request_id,
      requestTitle: titles.get(record.request_id) ?? null,
      actorId: record.actor_id,
      readAt: record.read_at,
      createdAt: record.created_at,
    });
  }
  return notifications;
}

export async function fetchNotifications(client: SupabaseClient): Promise<Notification[]> {
  await refreshDueNotifications(client);

  const { data, error } = await client
    .from("notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .order("id")
    .limit(NOTIFICATION_LIMIT);
  if (error) {
    throw new Error("Could not load notifications.", { cause: error });
  }
  const records = (data ?? []) as unknown as NotificationRecord[];

  const requestIds = [...new Set(records.map((record) => record.request_id))];
  const titles = new Map<string, string>();
  if (requestIds.length > 0) {
    const { data: rows, error: titleError } = await client
      .from("requests")
      .select("id,title")
      .in("id", requestIds);
    if (titleError) {
      throw new Error("Could not load notifications.", { cause: titleError });
    }
    for (const row of (rows ?? []) as unknown as {
      id: string;
      title: string;
    }[]) {
      titles.set(row.id, row.title);
    }
  }
  return mapNotifications(records, titles);
}

export async function fetchUnreadCount(client: SupabaseClient): Promise<number> {
  await refreshDueNotifications(client);

  const { count, error } = await client
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  if (error) {
    throw new Error("Could not load notifications.", { cause: error });
  }
  return count ?? 0;
}

export async function markNotificationsRead(
  client: SupabaseClient,
  ids: readonly string[],
): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", [...ids])
    .is("read_at", null);
  if (error) {
    throw new Error("Could not mark the notifications as read.", {
      cause: error,
    });
  }
}

export async function markAllNotificationsRead(client: SupabaseClient): Promise<void> {
  // Row level security limits this to the signed-in person's own notifications.
  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .is("read_at", null);
  if (error) {
    throw new Error("Could not mark the notifications as read.", {
      cause: error,
    });
  }
}
