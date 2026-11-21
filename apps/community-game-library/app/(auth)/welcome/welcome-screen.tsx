import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { headers } from "next/headers";
import Link from "next/link";
import { connection } from "next/server";
import { DicePair } from "@/app/_components/dice";
import { CopyLinkButton } from "@/app/_components/open-in-browser";
import { Piece } from "@/app/_components/piece";
import { Steps } from "@/app/_components/steps";
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
        <h1 className="font-heading text-4xl leading-none font-bold uppercase">
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

      <ul className="mt-4 flex flex-col rounded-lg border-2 border-foreground bg-card *:border-dashed *:border-foreground *:not-first:border-t-2">
        <li className="flex items-center gap-3.5 p-3.5">
          <span
            aria-hidden="true"
            className="flex h-11 w-21 shrink-0 items-end justify-center gap-1"
          >
            <Piece shape="house" color="brick" size={24} />
            <Piece shape="house" color="ocean" size={24} />
            <Piece shape="pawn" color="mustard" size={24} />
          </span>
          <span className="flex-1 text-15 leading-snug font-semibold">
            See what your friends own.
          </span>
        </li>
        <li className="flex items-center gap-3.5 p-3.5">
          <span
            aria-hidden="true"
            className="flex w-21 shrink-0 flex-col gap-0.5"
          >
            <span className="flex">
              <span className="flex flex-1 justify-center">
                <Piece shape="pawn" color="mustard" size={16} />
              </span>
              <span className="flex-3" />
            </span>
            <span className="flex">
              <span className="h-4 flex-1 border-2 border-foreground bg-secondary" />
              <span className="h-4 flex-1 border-2 border-l-0 border-foreground bg-secondary" />
              <span className="h-4 flex-1 border-2 border-l-0 border-foreground bg-secondary" />
              <span className="h-4 flex-1 border-2 border-l-0 border-foreground bg-destructive" />
            </span>
          </span>
          <span className="flex-1 text-15 leading-snug font-semibold">
            Borrow a game and know when it’s due.
          </span>
        </li>
        <li className="flex items-center gap-3.5 p-3.5">
          <span className="flex w-21 shrink-0 justify-center">
            <DicePair onBone />
          </span>
          <span className="flex-1 text-15 leading-snug font-semibold">
            Plan a game night and pick what to play.
          </span>
        </li>
      </ul>

      <div className="mt-3 flex flex-col gap-2.5">{ways}</div>

      <p className="mt-auto text-center text-xs text-muted-foreground">
        Game data from BoardGameGeek.
      </p>
    </main>
  );
}

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
// there, so this asks for the phone's own browser.
function OpenInBrowser() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 px-4 pt-4 pb-6">
      <p className="font-heading text-xl leading-none font-bold uppercase">
        Community Game Library
      </p>
      <div className="mt-3 flex flex-col gap-2">
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
            text: "Tap the menu (··· or the share icon) on this page",
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
