import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { getInjection } from "@/di/container";

// Where any account but the app's two lands (app/_lib/current-actor.ts; docs/build-plan.md
// R23): the generic name, which account is signed in and a way out. No data, and nothing that
// says whose workspace this is.
export default function PrivatePage() {
  return (
    <main className="pt-safe-10 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Job search</h1>
        <p className="text-muted-foreground text-balance">
          This workspace is private.
        </p>
        <Suspense fallback={<Skeleton className="h-5 w-56" />}>
          <SignedInAs />
        </Suspense>
      </div>

      {/* At least 44 px tall: a touch target (the default theme's lg Button is 36). */}
      <Button
        size="lg"
        className="min-h-11"
        nativeButton={false}
        render={<Link href={`/auth/${authViewPaths.SIGN_OUT}`} />}
      >
        Sign out
      </Button>
    </main>
  );
}

// Which account this is, known only at request time; the rest of the screen is the same for
// everyone, so it's prerendered.
async function SignedInAs() {
  const session = await getInjection("IAuthenticationService").getSession();
  return session ? (
    <p className="text-sm">Signed in as {session.user.email}</p>
  ) : null;
}
