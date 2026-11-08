import Link from "next/link";
import { BrandMark } from "@/components/layout/brand";

const primaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90";
const secondaryLink =
  "inline-flex min-h-11 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-muted";

const differences = [
  {
    title: "Blocked work has a reason",
    body: "Moving a request to Blocked requires a reason: waiting for the client, waiting for a team decision, a technical problem, or a dependency on other work. The dashboard groups blocked work by that reason.",
  },
  {
    title: "Attention rules you can read",
    body: "Overdue requests, requests nobody owns, requests that have waited too long, and high-priority requests that are almost due. Every item on the dashboard says which rule put it there.",
  },
  {
    title: "Views you can share",
    body: "Search, filters and sorting live in the URL. Save a combination as a view, or send the link and a teammate sees exactly what you see.",
  },
];

export default function Home() {
  return (
    <>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="inline-flex items-center gap-2.5 text-lg font-bold">
            <BrandMark />
            RelayDesk
          </span>
          <nav aria-label="Account" className="flex items-center gap-2">
            <Link href="/login" className={secondaryLink}>
              Log in
            </Link>
            <Link href="/signup" className={primaryLink}>
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <section aria-labelledby="hero-heading" className="max-w-2xl">
          <h1 id="hero-heading" className="text-3xl font-bold tracking-tight sm:text-4xl">
            See why work is stuck, not just that it is.
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            RelayDesk is a request tracker for small, remote teams. Work arrives from email, chat
            and meetings. RelayDesk shows who owns it, what is urgent, what is waiting on someone
            else, and what is actually done.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {/* A plain link on purpose: the route signs in on the server, so the client router
                must not prefetch it or handle the click. */}
            <a href="/demo" className={primaryLink}>
              Try the demo
            </a>
            <Link href="/signup" className={secondaryLink}>
              Get started
            </Link>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            The demo opens a workspace filled with sample requests. No sign-up needed.
          </p>
        </section>

        <section aria-labelledby="differences-heading" className="mt-16">
          <h2 id="differences-heading" className="text-xl font-semibold">
            What makes it different
          </h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-3">
            {differences.map((item) => (
              <li
                key={item.title}
                className="rounded-xl border border-border bg-surface p-5 shadow-card"
              >
                <h3 className="font-medium">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-border">
        <p className="mx-auto max-w-5xl px-4 py-6 text-sm text-muted-foreground">
          RelayDesk is a demo project. All names and contact details in the sample data are
          fictional.
        </p>
      </footer>
    </>
  );
}
