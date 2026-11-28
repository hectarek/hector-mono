import Link from "next/link";
import { SITE_NAME } from "@/src/site";

// Stays at the top, so a reader who lands deep from a texted link can always reach the rest.
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-background">
      <nav
        aria-label="Site"
        className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center font-semibold"
        >
          {SITE_NAME}
        </Link>
        <div className="flex gap-4 text-base">
          <Link href="/#topics" className="inline-flex min-h-11 items-center">
            Topics
          </Link>
          <Link href="/words" className="inline-flex min-h-11 items-center">
            Words
          </Link>
        </div>
      </nav>
    </header>
  );
}
