"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { Sheet } from "@/app/_components/sheet";
import type { PieceColor, PieceShape } from "@/src/entities/piece";
import { PickUpForm } from "./pick-up-form";

// C17's Priya has it (R18's audit line): for when the borrower picked it up and hasn't said so. Its
// sheet takes the day, as C3's When you have it does, and the page then reads as C7.
export function OwnerPickUp({
  loanId,
  loan,
  saidYesOn,
  borrower,
  today,
}: {
  loanId: string;
  loan: { periodDays: number | null; dueOn: string | null };
  saidYesOn: string;
  borrower: { name: string; pieceShape: PieceShape; pieceColor: PieceColor };
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const label = `${borrower.name} has it`;
  return (
    <>
      <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title={label}>
        <PickUpForm
          loanId={loanId}
          loan={loan}
          saidYesOn={saidYesOn}
          borrower={borrower}
          today={today}
          submitLabel={label}
          onDone={() => setOpen(false)}
        />
      </Sheet>
    </>
  );
}
