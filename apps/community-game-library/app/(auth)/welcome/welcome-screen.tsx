import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { ShareIcon } from "@/app/_components/icons";
import { CopyLinkButton } from "@/app/_components/open-in-browser";
import { Steps } from "@/app/_components/steps";
import { WhatItsFor } from "@/app/_components/what-its-for";
import { safeRedirect } from "@/app/_lib/safe-redirect";
import { inAppBrowserOf } from "@/src/entities/in-app-browser";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function WelcomeOrOpenInBrowser({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await connection();
  if (inAppBrowserOf((await headers()).get("user-agent"))) {
    return <OpenInBrowser />;
  }
  const redirectTo = safeRedirect((await searchParams).redirectTo);
  const query =
    redirectTo === "/" ? "" : `?${new URLSearchParams({ redirectTo })}`;
  return (
    <Welcome
      ways={
        <>
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
        </>
      }
    />
  );
}

// A1: what the app is for, in three lines, then the two ways in.
export function Welcome({ ways }: { ways: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-3 px-4 pt-18 pb-5">
      <div className="flex flex-col gap-3">
        <h1 className="font-heading text-40 leading-none font-bold uppercase">
          Community
          <br />
          Game
          <br />
          Library
        </h1>
        <p className="text-base leading-snug text-muted-foreground">
          Your friends’ board games, in one place.
        </p>
      </div>

      <WhatItsFor />

      <div className="mt-3 flex flex-col gap-2.5">{ways}</div>

      {/* The catalog's credit is on About the catalog and under search results (U24), so the
          foot links the privacy policy and the terms, which Google's consent screen needs. */}
      <p className="mt-auto flex justify-center text-xs text-muted-foreground">
        <Link href="/privacy" className={FOOT_LINK}>
          Privacy
        </Link>
        <span aria-hidden="true" className="flex items-center">
          ·
        </span>
        <Link href="/terms" className={FOOT_LINK}>
          Terms
        </Link>
      </p>
    </main>
  );
}

const FOOT_LINK =
  "flex min-h-11 items-center px-2 underline underline-offset-4 hover:text-foreground";

export function WaysInPlaceholder() {
  return (
    <div role="status" aria-busy="true" className="flex flex-col gap-2.5">
      <span className="sr-only">Loading</span>
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

// A9: Google refuses to sign in inside another app's browser, and the home-screen step is missing
// there, so this asks for the phone's own browser. A friend link shows it too.
export function OpenInBrowser() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-4 pb-6">
      <p className="font-heading text-xl leading-none font-bold uppercase">
        Community Game Library
      </p>
      <div className="mt-2 flex flex-col gap-2">
        <h1 className="text-2xl leading-tight font-bold">
          Open this in your browser
        </h1>
        <p className="text-sm leading-snug text-muted-foreground">
          You opened this link inside another app. Signing in with Google and
          putting Game Library on your home screen only work in your phone’s own
          browser.
        </p>
      </div>
      <Steps
        steps={[
          {
            id: "menu",
            text: (
              <>
                Tap the menu (··· or the share icon{" "}
                <ShareIcon className="inline size-4.5 align-text-bottom" />)
              </>
            ),
          },
          { id: "choose", text: "Choose Open in Safari or Open in Chrome" },
        ]}
      />
      <div className="mt-1 flex flex-col gap-2">
        <CopyLinkButton />
        <p className="text-center text-13 leading-snug text-muted-foreground">
          Then paste it into your browser.
        </p>
      </div>
    </main>
  );
}
