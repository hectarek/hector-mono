"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
import { LoanTrack } from "@/app/_components/loan-track";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { confirmPassAlong, confirmPickUp } from "@/app/actions/loans";
import { datesAtPickUp } from "@/src/entities/loan";
import type { PieceColor, PieceShape } from "@/src/entities/piece";
import { formatDate } from "@/src/entities/week";
import { DayField } from "./day-field";

// C3's When you have it: the day it was picked up (today, or an earlier day from the yes on), the
// track and the due date that day gives, and I've picked it up. The owner's Priya has it sends the
// same, with its own button, and so does the next friend's I have it in a pass-along (handedOn),
// from the day it was handed on. The page then reads as C5 or C7.
export function PickUpForm({
  loanId,
  loan,
  saidYesOn,
  borrower,
  today,
  submitLabel,
  handedOn = false,
  onDone,
}: {
  loanId: string;
  loan: { periodDays: number | null; dueOn: string | null };
  // The day of the yes, the first a pick-up can be on.
  saidYesOn: string;
  borrower: { pieceShape: PieceShape; pieceColor: PieceColor };
  today: string;
  submitLabel: string;
  // A pass-along's next loan: the day is when the giver handed it over (rule 10).
  handedOn?: boolean;
  onDone?: () => void;
}) {
  const [day, setDay] = useState(today);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const { dueOn } = datesAtPickUp(loan, day);
  const due = formatDate(dueOn, today);
  const last = loan.dueOn && loan.dueOn < today ? loan.dueOn : today;
  const when =
    day !== today
      ? `${handedOn ? "Handed to you" : "Picked up"} ${formatDate(day, today)}`
      : handedOn
        ? "If you get it today"
        : "If you pick it up today";

  const send = () =>
    startTransition(async () => {
      setError(undefined);
      const failed = await callAction(() =>
        handedOn ? confirmPassAlong(loanId, day) : confirmPickUp(loanId, day),
      );
      if (failed) {
        setError(failed);
        return;
      }
      onDone?.();
      notify("The loan has started.");
    });

  return (
    <div className="flex flex-col gap-3">
      <DayField
        id={`picked-up-${loanId}`}
        label={handedOn ? "Handed to you on" : "Picked up on"}
        hint="Set an earlier day if you’re confirming late."
        today={today}
        from={saidYesOn}
        until={last}
        value={day}
        onChange={setDay}
      />
      <LoanTrack
        pickedUpOn={day}
        dueOn={dueOn}
        today={today}
        borrower={borrower}
      />
      <p className="text-13 leading-snug text-muted-foreground">
        {`${when}, it’s due ${due}.`}
      </p>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      <Button size="lg" onClick={send} disabled={pending}>
        {submitLabel}
      </Button>
    </div>
  );
}
