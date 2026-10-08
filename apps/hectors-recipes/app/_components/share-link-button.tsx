"use client";

import { Button } from "@repo/ui/components/button";
import { Check, Copy, Share2 } from "lucide-react";
import { type ComponentProps, useState, useSyncExternalStore } from "react";

const noChange = () => () => {};

// Whether this browser has a share sheet. The server can't tell, so it renders the phone's
// answer (where most links are sent), and a browser without one says Copy once loaded.
function useCanShare(): boolean {
  return useSyncExternalStore(
    noChange,
    () => typeof navigator.share === "function",
    () => true,
  );
}

// Shares a link to a page of the app (an invite, a recipe): phones get the native share
// sheet (Messages etc.), elsewhere it's copied. share() is called straight from the tap,
// before anything else is awaited: iOS only opens the sheet from a tap. So the link must
// already exist; until then it's disabled.
export function ShareLinkButton({
  path,
  title,
  label = { share: "Share link", copy: "Copy link" },
  pending = false,
  variant = "secondary",
}: {
  // The page's path ("/join/…"), or undefined while it's being made.
  path: string | undefined;
  // What the share sheet calls it ("Join Hector's Recipes").
  title: string;
  // What the button says it does, with a share sheet and without (P23.3): testers didn't
  // take "Can edit" and "View only" for buttons that share a link.
  label?: { share: string; copy: string };
  pending?: boolean;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
  const canShare = useCanShare();
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function share() {
    const url = `${window.location.origin}${path}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
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
      disabled={!path}
      onClick={share}
    >
      <Icon data-icon="inline-start" />
      {pending
        ? "Getting a link…"
        : status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Couldn't copy"
            : canShare
              ? label.share
              : label.copy}
    </Button>
  );
}
