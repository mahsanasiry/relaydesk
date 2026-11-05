import type { Metadata } from "next";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({
  searchParams,
}: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const { next } = await searchParams;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Log in</h1>
      <LoginForm next={typeof next === "string" ? next : null} />
    </>
  );
}
