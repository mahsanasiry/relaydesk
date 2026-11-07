import type { Metadata } from "next";
import { SettingsView } from "@/features/settings/components/settings-view";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <SettingsView email={user?.email ?? ""} />;
}
