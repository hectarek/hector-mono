"use client";

import { Button } from "@repo/ui/components/button";
import { useState, useTransition } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Piece } from "@/app/_components/piece";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { callAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { changeDueDate } from "@/app/actions/loans";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { CoverColor } from "@/src/entities/piece";
import { addDays, formatDate } from "@/src/entities/week";
import { DateChoice } from "./date-choice";

// C7's Change the due date and its sheet (C14, R20): 3 more days, 1 more week or a picked date,
// counted from the due date, or from today once it's overdue; who in line waits longer; and that
// the borrower is told the new date.
export function ChangeDueSheet({
  loanId,
  title,
  color,
  imageUrl,
  dueOn,
  from,
  borrower,
  nextName,
  today,
}: {
  loanId: string;
  title: string;
  color: CoverColor;
  imageUrl: string | null;
  dueOn: string;
  from: string;
  borrower: NameAndPiece;
  nextName: string | null;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | undefined>(addDays(from, 7));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      if (!day) return;
      setError(undefined);
      const failed = await callAction(() =>
        changeDueDate(loanId, day, borrower.name),
      );
      if (failed) {
        setError(failed);
        return;
      }
      setOpen(false);
      notify(`${borrower.name} is told the new date.`);
    });

  return (
    <>
      <Button
        variant="link"
        className="self-center"
        onClick={() => setOpen(true)}
      >
        Change the due date
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Change the due date">
        <div className="flex items-center gap-3">
          <CoverThumb color={color} imageUrl={imageUrl} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">{title}</span>
            <span className="flex items-center gap-1.25 font-mono text-2xs font-medium text-muted-foreground">
              Due {formatDate(dueOn, today)} ·
              <Piece
                shape={borrower.pieceShape}
                color={borrower.pieceColor}
                size={11}
              />
              {borrower.name} has it
            </span>
          </div>
        </div>
        <DateChoice
          id={`new-due-${loanId}`}
          legend="New due date"
          from={from}
          today={today}
          onChange={setDay}
        />
        {dueOn < today && (
          <p className="-mt-2 text-xs text-muted-foreground">
            It’s overdue, so these count from today.
          </p>
        )}
        <div className="flex flex-col gap-1 text-13 leading-snug text-muted-foreground">
          {nextName && <p>{nextName} is 1st in line and waits longer.</p>}
          <p>{borrower.name} is told the new date.</p>
        </div>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <SheetActions>
          <Button size="lg" onClick={send} disabled={pending || !day}>
            Change the due date
          </Button>
        </SheetActions>
      </Sheet>
    </>
  );
}
