import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { buttonClassName } from "@/components/ui/button";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const { next, demo } = await searchParams;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      {demo === "unavailable" ? (
        <div className="mb-4">
          <Alert tone="error">
            The demo is not available right now. Log in or create an account instead.
          </Alert>
        </div>
      ) : null}
      <LoginForm next={typeof next === "string" ? next : null} />
      <div className="mt-6 space-y-3 border-t border-border pt-6">
        <p className="text-sm text-muted-foreground">
          Only looking around? Open a workspace filled with sample requests. No sign-up needed.
        </p>
        {/* A plain link on purpose: the route signs in on the server, so the client router must
            not prefetch it or handle the click. */}
        <a href="/demo" className={buttonClassName("secondary", "w-full")}>
          Try the demo
        </a>
      </div>
    </>
  );
}
