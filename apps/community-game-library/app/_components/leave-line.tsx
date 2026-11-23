"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { leaveLine } from "@/app/actions/loans";

// Leave the line (B13 on a game's page, and the request's own page), after "Leave the line for
// Fenwick Fair?" (screens.md, Actions that ask first). The page then reads as it does for someone
// not in line; from the request's page, Loans opens.
export function LeaveLine({
  loanId,
  title,
  size,
  thenOpen,
}: {
  loanId: string;
  title: string;
  size?: "sm" | "lg";
  // Where to go once it's done, when the page the member is on was the request's.
  thenOpen?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function confirm() {
    const result = await callResultAction(() => leaveLine(loanId));
    if (result?.error !== undefined) {
      return result.error;
    }
    if (thenOpen) {
      router.push(thenOpen);
    }
    if (result && "message" in result && result.message) {
      notify(result.message);
    }
    return undefined;
  }

  return (
    <>
      <Button
        variant={size === "lg" ? "secondary" : "link"}
        size={size}
        onClick={() => setOpen(true)}
        className={size === "lg" ? "w-full" : undefined}
      >
        Leave the line
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Leave the line for ${title}?`}
        confirmLabel="Leave the line"
        keepLabel="Stay in line"
        onConfirm={confirm}
      >
        You lose your place.
      </ConfirmDialog>
    </>
  );
}
