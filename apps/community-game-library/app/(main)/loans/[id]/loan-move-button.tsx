"use client";

import { Button } from "@repo/ui/components/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { cancelLoan, withdrawRequest } from "@/app/actions/loans";

// A move that asks first and then leaves the loan's page (screens.md, Actions that ask first):
// Withdraw my request (C16), Cancel this loan (C17) and I can't pick it up after all (C3). Once
// it's done, Loans opens with the message.
export function LoanMoveButton({
  move,
  loanId,
  otherName,
  label,
  variant,
  title,
  body,
}: {
  move: "withdraw" | "cancel";
  loanId: string;
  // The other person, who's told.
  otherName: string;
  label: string;
  variant: "secondary" | "destructive" | "link";
  title: string;
  body: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function confirm() {
    const result = await callResultAction(() =>
      move === "withdraw"
        ? withdrawRequest(loanId)
        : cancelLoan(loanId, otherName),
    );
    if (result?.error !== undefined) {
      return result.error;
    }
    router.push("/loans");
    if (result && "message" in result && result.message) {
      notify(result.message);
    }
    return undefined;
  }

  return (
    <>
      <Button
        variant={variant}
        size={variant === "link" ? undefined : "lg"}
        onClick={() => setOpen(true)}
        className={variant === "link" ? "self-start" : "w-full"}
      >
        {label}
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        confirmLabel={move === "withdraw" ? "Withdraw it" : "Cancel the loan"}
        keepLabel="Keep it"
        onConfirm={confirm}
      >
        {body}
      </ConfirmDialog>
    </>
  );
}
