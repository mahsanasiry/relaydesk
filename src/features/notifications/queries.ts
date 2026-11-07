"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import { useSupabase } from "@/lib/supabase/use-supabase";
import {
  fetchNotifications,
  fetchUnreadCount,
  markAllNotificationsRead,
  markNotificationsRead,
} from "./api";

const UNREAD_POLL_MS = 60_000;

export function useNotifications() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.notificationsList,
    queryFn: () => fetchNotifications(supabase),
  });
}

export function useUnreadCount() {
  const supabase = useSupabase();
  return useQuery({
    queryKey: queryKeys.notificationsUnread,
    queryFn: () => fetchUnreadCount(supabase),
    // There is no live channel in this app, so the badge checks back now and then.
    refetchInterval: UNREAD_POLL_MS,
  });
}

export function useMarkRead() {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: (ids: readonly string[]) => markNotificationsRead(supabase, ids),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}

export function useMarkAllRead() {
  const supabase = useSupabase();
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => markAllNotificationsRead(supabase),
    onSuccess: () => client.invalidateQueries({ queryKey: queryKeys.notifications }),
  });
}
