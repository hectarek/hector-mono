import { AuthView } from "@neondatabase/auth/react";
import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthNotice } from "@/app/_components/auth-notice";
import { BackLink } from "@/app/_components/back-link";
import { AUTH_PATHS, skipsWhenSignedIn } from "@/app/_lib/auth-paths";
import { safeRedirect } from "@/app/_lib/safe-redirect";
import { auth } from "@/lib/auth/server";
import { authHeading, authWordsOf } from "./view-parts";

export function generateStaticParams() {
  return AUTH_PATHS.map((path) => ({ path }));
}

// Neon's view, restyled to Punchboard (A2, A8) through its class names: the card's frame and
// padding go, since the screen is the page, and its parts take the app's own look from
// the theme's restyle of the shared fields and buttons.
const CLASS_NAMES = {
  base: "border-0 bg-transparent py-0 shadow-none",
  header: "px-0",
  content: "px-0",
  footer: "px-0",
  // Neon's fields are its own components (not @repo/ui's Input), so the theme's restyle of the
  // shared fields doesn't reach them: the kit's 44px field with a 2px edge on bone.
  form: {
    input:
      "h-11 rounded-sm border-2 border-foreground bg-secondary px-3 text-base",
    label: "text-13 font-semibold",
    button:
      "min-h-12 rounded-sm border-2 border-foreground text-base font-bold",
    // A8's Forgot your password?: a quiet link with a 44px target, last in the password's
    // field, under any error line (app/globals.css lets it out of the label's row).
    forgotPasswordLink:
      "order-1 flex min-h-11 items-center justify-self-start text-sm font-bold text-foreground underline decoration-dashed decoration-2 underline-offset-5",
  },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// The path is checked before anything streams, so an unknown one is a real 404. That check
// reads the address outside <Suspense>, so a tap into a sign-in page waits for the server
// (every known path is prerendered) instead of showing a placeholder first.
export const instant = false;

export default async function AuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ path: string }>;
  searchParams: SearchParams;
}) {
  const { path } = await params;
  if (!AUTH_PATHS.includes(path)) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-3 pb-6">
      <Suspense>
        <AuthForm path={path} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Where to go afterwards (?redirectTo=) and whether someone's already signed in are only known
// at request time, so the screen waits for them: someone signed in goes on without the form
// showing first. A prefetch or a prerender stops at connection(), before Neon's session fetch,
// which would otherwise fail and log once that render ends (docs/solutions/runtime-errors/
// partial-prefetching-runs-page-reads-that-fail-in-production.md).
async function AuthForm({
  path,
  searchParams,
}: {
  path: string;
  searchParams: SearchParams;
}) {
  await connection();
  const redirectTo = safeRedirect((await searchParams).redirectTo);
  if (skipsWhenSignedIn(path)) {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      redirect(redirectTo);
    }
  }
  const query =
    redirectTo === "/" ? "" : `?${new URLSearchParams({ redirectTo })}`;

  return (
    <>
      <BackLink href={`/welcome${query}`} label="Welcome" />
      {/* The prop overrides the raw ?redirectTo= that AuthView would otherwise trust. */}
      <AuthView
        path={path}
        redirectTo={redirectTo}
        classNames={CLASS_NAMES}
        className="max-w-none"
        cardHeader={authHeading(path, redirectTo)}
        localization={authWordsOf(path)}
      />
      <AuthNotice signInHref={`/auth/${authViewPaths.SIGN_IN}${query}`} />
    </>
  );
}
