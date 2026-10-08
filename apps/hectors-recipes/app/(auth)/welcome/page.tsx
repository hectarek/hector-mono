import { authViewPaths } from "@neondatabase/auth/react/ui/server";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import Link from "next/link";
import { Logo } from "@/app/_components/logo";
import { ProduceArt } from "@/app/_components/produce-art";
import type { Produce } from "@/app/_components/produce-tile";
import { safeRedirect } from "@/app/_lib/safe-redirect";
import { SPACE_TYPE_CONTENTS } from "@/app/_lib/space-href";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { InvitePreview } from "@/src/entities/models/space.model";

export const dynamic = "force-dynamic";

// The screen's one bold moment: the produce row, each drawing tilted a few degrees.
const PRODUCE_ROW: { produce: Produce; tilt: string }[] = [
  { produce: "tomato", tilt: "-rotate-4" },
  { produce: "carrot", tilt: "rotate-3" },
  { produce: "lemon", tilt: "-rotate-3" },
  { produce: "basil", tilt: "rotate-4" },
  { produce: "plum", tilt: "-rotate-3" },
];

// What an invite link is for, so someone arriving from one knows why they're here. The
// welcome screen still works without it (bad link, or the lookup failed).
async function invitedTo(redirectTo: string): Promise<InvitePreview | null> {
  const token = /^\/join\/([^/?#]+)/.exec(redirectTo)?.[1];
  if (!token) {
    return null;
  }
  try {
    return await getInjection("IPreviewInviteController")({ token }, undefined);
  } catch (err) {
    if (!(err instanceof NotFoundError || err instanceof InputParseError)) {
      getInjection("ILoggerService")
        .child({ layer: "page", op: "welcome" })
        .error("Failed to preview invite", { error: String(err) });
    }
    return null;
  }
}

// Signed-out visitors start here (proxy.ts): the app's name and what it's for, then
// straight on to creating an account or signing in, wherever they were headed.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const redirectTo = safeRedirect((await searchParams).redirectTo);
  const invite = await invitedTo(redirectTo);
  const query =
    redirectTo === "/" ? "" : `?${new URLSearchParams({ redirectTo })}`;

  return (
    <main className="pt-safe-10 pb-safe-6 mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-4">
      <div className="flex flex-1 flex-col items-center justify-center gap-8 text-center">
        <div className="flex items-end justify-center gap-1">
          {PRODUCE_ROW.map(({ produce, tilt }) => (
            <ProduceArt
              key={produce}
              produce={produce}
              className={cn("size-12", tilt)}
            />
          ))}
        </div>
        <div className="flex flex-col items-center gap-3">
          <h1>
            <Logo className="h-6 w-auto" />
          </h1>
          <p className="text-muted-foreground max-w-xs text-lg text-balance">
            Your recipes, the week&apos;s meal plan and shared groceries.
          </p>
        </div>
      </div>

      {invite && (
        <div
          role="note"
          className="bg-secondary text-secondary-foreground flex flex-col gap-1 rounded-xl p-4 text-center"
        >
          <p className="font-medium text-balance">
            You&apos;ve been invited to &ldquo;{invite.spaceName}&rdquo;
          </p>
          <p className="text-sm">
            A shared {SPACE_TYPE_CONTENTS[invite.spaceType]}. Create an account
            to join, or sign in if you have one.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <Button
          size="lg"
          nativeButton={false}
          render={<Link href={`/auth/${authViewPaths.SIGN_UP}${query}`} />}
        >
          Create account
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
    </main>
  );
}
