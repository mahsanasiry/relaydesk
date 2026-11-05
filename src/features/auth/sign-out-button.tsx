"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { signOutAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" loading={pending}>
      {pending ? "Logging out..." : "Log out"}
    </Button>
  );
}

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <SubmitButton />
    </form>
  );
}
