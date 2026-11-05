"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { Brand } from "./brand";
import { NavLinks } from "./nav-links";

export function MobileNav({ userName }: { userName: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pathname = usePathname();

  // Covers navigation that does not start from a drawer link, such as the back button.
  useEffect(() => {
    dialogRef.current?.close();
  }, [pathname]);

  const close = () => dialogRef.current?.close();

  return (
    <div className="lg:hidden">
      <Button
        variant="secondary"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
      >
        Open menu
      </Button>
      {/* A modal dialog gives focus trapping, Escape to close and an inert page behind it. */}
      <dialog
        ref={dialogRef}
        aria-label="Navigation menu"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        className="m-0 h-dvh max-h-dvh w-72 max-w-[85vw] border-r border-border bg-surface p-4 text-foreground backdrop:bg-black/50"
      >
        <div className="flex h-full flex-col gap-6">
          <div className="flex items-center justify-between">
            <Brand />
            <Button variant="secondary" onClick={close}>
              Close menu
            </Button>
          </div>
          <NavLinks label="Main (mobile)" onNavigate={close} />
          <div className="mt-auto space-y-3 border-t border-border pt-4">
            <p className="truncate text-sm text-muted-foreground">{userName}</p>
            <SignOutButton />
          </div>
        </div>
      </dialog>
    </div>
  );
}
