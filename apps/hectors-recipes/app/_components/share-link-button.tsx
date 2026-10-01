"use client";

import { Button } from "@repo/ui/components/button";
import { Check, Share2 } from "lucide-react";
import { type ComponentProps, type ReactNode, useState } from "react";

// Shares an invite link: phones get the native share sheet (Messages etc.), elsewhere it's
// copied. share() is called straight from the tap, before anything else is awaited: iOS
// only opens the sheet from a tap. So the link must already exist; until then it's disabled.
export function ShareLinkButton({
  token,
  spaceName,
  children = "Share link",
  variant = "outline",
}: {
  token: string | undefined;
  spaceName: string;
  children?: ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
}) {
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

  return (
    <Button
      variant={variant}
      size="lg"
      type="button"
      disabled={!token}
      onClick={share}
    >
      {status === "copied" ? (
        <Check data-icon="inline-start" />
      ) : (
        <Share2 data-icon="inline-start" />
      )}
      {status === "copied"
        ? "Copied"
        : status === "failed"
          ? "Couldn't copy"
          : children}
    </Button>
  );
}
