"use client";

import { Button } from "@repo/ui/components/button";
import { Check, Copy, Share2 } from "lucide-react";
import { type ComponentProps, useState, useSyncExternalStore } from "react";

const noChange = () => () => {};

// Whether this browser has a share sheet. The server can't tell, so it renders the phone's
// answer (where most invites are sent), and a browser without one says Copy once loaded.
function useCanShare(): boolean {
  return useSyncExternalStore(
    noChange,
    () => typeof navigator.share === "function",
    () => true,
  );
}

// What the button does, in its words (P23.3): testers didn't take "Can edit" and "View only"
// for buttons that share a link.
function shareLabel(canShare: boolean, role?: "editor" | "viewer"): string {
  const verb = canShare ? "Share" : "Copy";
  if (role === "editor") return `${verb} a link to edit`;
  if (role === "viewer") return `${verb} a view-only link`;
  return `${verb} link`;
}

// Shares an invite link: phones get the native share sheet (Messages etc.), elsewhere it's
// copied. share() is called straight from the tap, before anything else is awaited: iOS
// only opens the sheet from a tap. So the link must already exist; until then it's disabled.
export function ShareLinkButton({
  token,
  spaceName,
  gives,
  pending = false,
  variant = "secondary",
}: {
  token: string | undefined;
  spaceName: string;
  // The role the link gives, named on the button; a link's row on the members page shows it
  // beside the button instead.
  gives?: "editor" | "viewer";
  // The link is still being made.
  pending?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const canShare = useCanShare();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = `${window.location.origin}/join/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${spaceName}`, url });
        return;
      } catch (err) {
        // Closing the sheet is a choice, not a failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  const Icon = status === "copied" ? Check : canShare ? Share2 : Copy;
  return (
    <Button
      variant={variant}
      size="lg"
      type="button"
      disabled={!token}
      onClick={share}
    >
      <Icon data-icon="inline-start" />
      {pending
        ? "Getting a link…"
        : status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Couldn't copy"
            : shareLabel(canShare, gives)}
    </Button>
  );
}
