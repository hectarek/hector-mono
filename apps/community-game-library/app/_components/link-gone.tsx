import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import type { ReactNode } from "react";

// A link's page frame (a friend's, A3; a night's, D14): the app's name and what it's for, set
// down the page as A3 and D14 draw them, above the page's own part. It imports nothing
// server-only, since the client part that opens a link shows LinkGone too.
export function LinkPage({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-18 pb-5">
      <p className="font-heading text-28 leading-none font-bold uppercase">
        Community Game Library
      </p>
      <p className="text-base leading-snug text-muted-foreground">
        Your friends’ board games, in one place.
      </p>
      {children}
    </main>
  );
}

// A link that has run out or been replaced (screens.md, When something goes wrong), or that
// can't be used, such as a member's own.
export function LinkGone({
  line,
  next,
}: {
  line: string;
  next: { href: string; label: string };
}) {
  return (
    <LinkPage>
      <section className="mt-3 flex flex-col gap-3">
        <h1 className="text-2xl leading-tight font-bold">{line}</h1>
        <Button
          variant="secondary"
          nativeButton={false}
          render={<Link href={next.href} />}
          className="self-start"
        >
          {next.label}
        </Button>
      </section>
    </LinkPage>
  );
}
