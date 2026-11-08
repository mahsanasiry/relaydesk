import type { Metadata } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/figtree";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "RelayDesk",
    template: "%s | RelayDesk",
  },
  description:
    "Request tracking for small, remote teams. See who owns each request and why stuck work is stuck.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
