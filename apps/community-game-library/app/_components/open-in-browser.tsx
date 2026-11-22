"use client";

import { Button } from "@repo/ui/components/button";
import { notify } from "@/app/_lib/notify";

// "Copy the link" on A9: the address this page was opened at, for pasting into the phone's own
// browser.
export function CopyLinkButton() {
  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      notify("Link copied.");
    } catch {
      notify("That didn’t copy. Use the menu instead.");
    }
  }
  return (
    <Button size="lg" type="button" onClick={copy}>
      Copy the link
    </Button>
  );
}
