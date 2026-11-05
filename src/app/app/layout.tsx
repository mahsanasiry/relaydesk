import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ToastProvider } from "@/components/ui/toast";
import { CurrentUserProvider } from "@/features/auth/current-user";
import { LOGIN_PATH } from "@/lib/auth/redirects";
import { QueryProvider } from "@/lib/query/provider";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const supabase = await createSupabaseServerClient();
  // The proxy only checks the token signature. This call asks the auth server, so a deleted
  // or banned account is turned away here even while its token is still valid.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(LOGIN_PATH);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name,workspace_id")
    .eq("id", user.id)
    .maybeSingle();
  // Redirecting to login here would loop, because the proxy sends signed-in visitors back.
  if (typeof profile?.workspace_id !== "string") {
    throw new Error("This account has no workspace. Contact the person who invited you.");
  }
  const name =
    typeof profile.display_name === "string" ? profile.display_name : (user.email ?? "Account");

  return (
    <QueryProvider>
      <CurrentUserProvider
        user={{ id: user.id, displayName: name, workspaceId: profile.workspace_id }}
      >
        <ToastProvider>
          <AppShell userName={name}>{children}</AppShell>
        </ToastProvider>
      </CurrentUserProvider>
    </QueryProvider>
  );
}
