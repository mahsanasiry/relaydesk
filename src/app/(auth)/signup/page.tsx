import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/signup-form";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Create your account</h1>
      <SignupForm />
    </>
  );
}
