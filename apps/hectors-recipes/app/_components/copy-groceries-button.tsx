"use client";

import { Button } from "@repo/ui/components/button";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

// Copy groceries, in Groceries' ⋯ sheet (docs/ux-plan.md D94): what's left to buy, a line each,
// to paste anywhere. Pasted into Reminders, each line is a reminder. It copies on every device,
// rather than sharing, and says so for 2 s, as the share buttons do where they copy (P23.3).
export function CopyGroceriesButton({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
    setTimeout(() => setStatus("idle"), 2000);
  }

  return (
    <Button variant="secondary" size="lg" onClick={copy}>
      {status === "copied" ? (
        <Check data-icon="inline-start" />
      ) : (
        <Copy data-icon="inline-start" />
      )}
      {status === "copied"
        ? "Copied"
        : status === "failed"
          ? "Couldn't copy"
          : "Copy groceries"}
    </Button>
  );
}
