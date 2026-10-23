import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import Link from "next/link";
import { Suspense } from "react";
import { safeRedirect } from "@/app/_lib/safe-redirect";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// Signed-out visitors start here (proxy.ts): a generic name and the way in, never whose
// workspace this is (docs/build-plan.md R23).
export default function WelcomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <main className="pt-safe-10 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Job search</h1>
        <p className="text-muted-foreground text-balance">
          A private workspace. Sign in to continue.
        </p>
      </div>

      <Suspense fallback={<SignInPlaceholder />}>
        <SignIn searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Where someone was headed (?redirectTo=) is only known at request time; the rest of the
// screen is the same for everyone, so it's prerendered.
async function SignIn({ searchParams }: { searchParams: SearchParams }) {
  const redirectTo = safeRedirect((await searchParams).redirectTo);
  const query =
    redirectTo === "/" ? "" : `?${new URLSearchParams({ redirectTo })}`;

  return (
    <Button
      size="lg"
      className="min-h-11"
      nativeButton={false}
      render={<Link href={`/auth/${authViewPaths.SIGN_IN}${query}`} />}
    >
      Sign in
    </Button>
  );
}

function SignInPlaceholder() {
  return (
    <div role="status" aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-9 w-full" />
    </div>
  );
}
