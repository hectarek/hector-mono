"use client";

import { Button } from "@repo/ui/components/button";
import { ShareIcon } from "@/app/_components/icons";
import { notify } from "@/app/_lib/notify";
import { shareOrCopy } from "@/app/_lib/share";

// A button that shares a friend link, a night's link, or a ready message such as "Text Jo too"
// (KTD18, R52): it opens the phone's share sheet, and where there's none it copies the message
// and says so.
export function ShareButton({
  text,
  url,
  label = "Share",
  copied = "Copied",
}: {
  text: string;
  url?: string;
  label?: string;
  // The toast once it's copied ("Link copied").
  copied?: string;
}) {
  async function share() {
    const result = await shareOrCopy({ text, url });
    if (result === "copied") notify(copied);
    if (result === "failed") notify("That didn’t copy. Try again.");
  }
  return (
    <Button type="button" variant="secondary" onClick={share}>
      <ShareIcon data-icon="inline-start" />
      {label}
    </Button>
  );
}
