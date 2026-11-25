"use client";

import { Button } from "@repo/ui/components/button";
import { ShareIcon } from "@/app/_components/icons";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";

// Opens the phone's share sheet with the ready message, or where there's none copies it and says
// so with `copied` (KTD18, R52).
async function share(text: string, url: string | undefined, copied: string) {
  const result = await shareOrCopy({ text, url });
  if (result === "copied") notify(copied);
  if (result === "failed") notify("That didn’t copy. Try again.");
}

// A button that shares a ready message, with a link or without: the library's filters (B3).
export function ShareButton({
  text,
  url,
  label = "Share",
  copied = "Copied",
  className,
}: {
  text: string;
  url?: string;
  label?: string;
  // The toast once it's copied ("Link copied").
  copied?: string;
  // Where it sits: `self-start` keeps it at its own width in a column.
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      className={className}
      onClick={() => share(text, url, copied)}
    >
      <ShareIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}

// Every link the app hands out offers these two, side by side, as E2 draws them (Hector,
// 2026-11-25): your friend link (E2), and a night's on the host's page (D7) and on Invite people
// (D10). Share sends the ready message with the link; Copy puts the link alone on the clipboard.
// Share is filled where it's the screen's main action (E2); where another action is (D7's Invite
// people, D10's Send invites), `secondary` makes both secondary, as one main action per screen
// asks (screens.md, rule 2).
export function ShareAndCopy({
  text,
  url,
  secondary = false,
}: {
  text: string;
  url: string;
  secondary?: boolean;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied");
    } catch {
      notify("That didn’t copy. Try again.");
    }
  }
  return (
    <div className="flex gap-2.5">
      <Button
        type="button"
        size="lg"
        variant={secondary ? "secondary" : "default"}
        className="flex-1"
        onClick={() => share(text, url, "Link copied")}
      >
        <ShareIcon data-icon="inline-start" />
        Share
      </Button>
      <Button
        type="button"
        size="lg"
        variant="secondary"
        className="flex-1"
        onClick={copy}
      >
        Copy
      </Button>
    </div>
  );
}
