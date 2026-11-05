import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { LOGIN_PATH } from "@/lib/auth/redirects";
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
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const name = typeof profile?.display_name === "string" ? profile.display_name : user.email;

  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <span className="text-lg font-semibold">RelayDesk</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{name}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </>
  );
}
