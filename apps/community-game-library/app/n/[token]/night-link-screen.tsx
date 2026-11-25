import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { LinkPage } from "@/app/_components/link-gone";

// D14: a night's link opened signed out (R30, R36). Its title, its start and its seats, and never
// its place, which shows once the visitor is signed in.
export function NightLinkLanding({
  path,
  title,
  when,
  seats,
}: {
  // The link's own page, where sign-up and sign-in come back to.
  path: string;
  title: string;
  // "Fri, Nov 20 · 7:00 PM"
  when: string;
  // "6 seats · full, with a waitlist"
  seats: string;
}) {
  const query = `?${new URLSearchParams({ redirectTo: path })}`;
  return (
    <LinkPage>
      <section className="mx-1.5 mt-3.5 mb-1.5 flex flex-col gap-2 rounded-lg border-2 border-foreground bg-card px-4 py-3.5 outline-2 outline-offset-5 outline-foreground outline-dashed">
        <h1 className="text-15 font-bold">You’re invited to a game night</h1>
        <p className="text-2xl leading-tight font-bold">{title}</p>
        <div className="flex flex-col gap-1">
          <p className="font-mono text-13 font-medium">{when}</p>
          <p className="font-mono text-13 font-medium">{seats}</p>
        </div>
        <p className="text-sm leading-snug text-muted-foreground">
          Make an account or sign in to see where it is and answer.
        </p>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          The place shows once you’re signed in.
        </p>
      </section>
      <div className="mt-2 flex flex-col gap-2.5">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={`/auth/${authViewPaths.SIGN_UP}${query}`} />}
        >
          Make an account
        </Button>
        <Button
          size="lg"
          variant="secondary"
          nativeButton={false}
          render={<Link href={`/auth/${authViewPaths.SIGN_IN}${query}`} />}
        >
          Sign in
        </Button>
      </div>
    </LinkPage>
  );
}
