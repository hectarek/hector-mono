import { AuthView } from "@neondatabase/auth/react";
import { Button } from "@repo/ui/components/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { AUTH_PATHS, skipsWhenSignedIn } from "@/app/_lib/auth-paths";
import { safeRedirect } from "@/app/_lib/safe-redirect";
import { auth } from "@/lib/auth/server";

export function generateStaticParams() {
  return AUTH_PATHS.map((path) => ({ path }));
}

// Neon's wording, in the app's voice ("Sign in", not "Login"). Sign-up is off (AuthProvider).
const LOCALIZATION = {
  SIGN_IN: "Sign in",
  SIGN_IN_ACTION: "Sign in",
  SIGN_IN_DESCRIPTION: "Welcome back.",
};

// Full-screen like the welcome screen it comes from, not a card on a page. Neon's view
// takes class overrides for its card; these drop the card's frame and padding.
const CLASS_NAMES = {
  base: "border-0 bg-transparent py-0 shadow-none",
  header: "px-0",
  content: "px-0",
  footer: "px-0",
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
    <main className="pt-safe-2 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <Suspense>
        <AuthForm path={path} searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Where to go afterwards (?redirectTo=) and whether someone's already signed in are only
// known at request time, so the screen waits for them: someone signed in goes on without
// the form showing first.
async function AuthForm({
  path,
  searchParams,
}: {
  path: string;
  searchParams: SearchParams;
}) {
  const redirectTo = safeRedirect((await searchParams).redirectTo);
  if (skipsWhenSignedIn(path)) {
    const { data: session } = await auth.getSession();
    if (session?.user) {
      redirect(redirectTo);
    }
  }
  const welcomeHref =
    redirectTo === "/"
      ? "/welcome"
      : `/welcome?${new URLSearchParams({ redirectTo })}`;

  return (
    <>
      <Button
        variant="ghost"
        size="lg"
        nativeButton={false}
        render={<Link href={welcomeHref} />}
        className="-ml-2 self-start"
      >
        <ChevronLeft data-icon="inline-start" />
        Welcome
      </Button>
      <p className="font-semibold">Job search</p>
      {/* The prop overrides the raw ?redirectTo= that AuthView would otherwise trust. */}
      <AuthView
        path={path}
        redirectTo={redirectTo}
        localization={LOCALIZATION}
        classNames={CLASS_NAMES}
        className="max-w-none"
      />
    </>
  );
}
