import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import Link from "next/link";
import { LinkPage } from "@/app/_components/link-gone";
import { WhatItsFor } from "@/app/_components/what-its-for";

// A3: a friend's link opened signed out. It names nobody, since a signed-out page carries no
// member's name (R39); the two are friends once its visitor has an account and is in.
export function InviteLanding({
  path,
  worksUntil,
}: {
  // The link's own page, where sign-up and sign-in come back to.
  path: string;
  // "Tue, Nov 17"
  worksUntil: string;
}) {
  const query = `?${new URLSearchParams({ redirectTo: path })}`;
  return (
    <LinkPage>
      <section className="mx-1.5 mt-3.5 mb-1.5 flex flex-col gap-2 rounded-lg border-2 border-foreground bg-card px-4 py-3.5 outline-2 outline-offset-5 outline-foreground outline-dashed">
        <h1 className="text-15 font-bold">A friend sent you their link</h1>
        <p className="text-sm leading-snug text-muted-foreground">
          Make an account or sign in and you’ll be friends at once. You’ll see
          who once you’re in.
        </p>
        <p className="font-mono text-xs font-medium text-muted-foreground">
          This link works until {worksUntil}
        </p>
      </section>
      <WhatItsFor className="mt-2" />
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
