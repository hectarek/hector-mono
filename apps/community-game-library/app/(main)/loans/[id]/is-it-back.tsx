"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { Textarea } from "@repo/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Piece } from "@/app/_components/piece";
import { Sheet } from "@/app/_components/sheet";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { confirmReturn } from "@/app/actions/loans";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { CoverColor } from "@/src/entities/piece";
import { addDays, formatDate } from "@/src/entities/week";

// The days it can have come back on, today first, back to the pick-up: two months at most.
function daysBack(today: string, pickedUpOn: string): string[] {
  const days: string[] = [];
  for (let day = today; day >= pickedUpOn && days.length < 60; ) {
    days.push(day);
    day = addDays(day, -1);
  }
  return days;
}

// Is it back? (C8), the owner's sheet, with its two answers and no Cancel, as C8 draws it: the day it came back (the day the borrower gave, which the
// owner can change), anything new missing or damaged, added to the copy's note, then Yes, it's
// back. While the borrower says they gave it back, I don't have it yet puts the loan back out and
// tells them. It also marks a loan that's out as back without waiting (C7's It's back with me).
// After Yes, it's back, the next request in line opens, for the owner to answer, or Loans does.
export function IsItBack({
  loanId,
  title,
  color,
  imageUrl,
  borrower,
  pickedUpOn,
  gaveOn,
  conditionNote,
  nextName,
  today,
}: {
  loanId: string;
  title: string;
  color: CoverColor;
  imageUrl: string | null;
  borrower: NameAndPiece;
  pickedUpOn: string;
  // The day the borrower says they gave it back, while they wait for the owner.
  gaveOn: string | null;
  conditionNote: string | null;
  // Who's first in the copy's line.
  nextName: string | null;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState(gaveOn ?? today);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const answer = (choice: "back" | "not-yet") =>
    startTransition(async () => {
      setError(undefined);
      const result = await callResultAction(() =>
        confirmReturn(
          loanId,
          choice === "back"
            ? { answer: "back", returnedOn: day, note }
            : { answer: "not-yet" },
          { title, borrower: borrower.name },
        ),
      );
      if (!result || result.error !== undefined) {
        setError(result?.error);
        return;
      }
      setOpen(false);
      if (choice === "not-yet") {
        notify(result.message);
        return;
      }
      if (result.nextInLine) {
        router.push(`/loans/${result.nextInLine}`);
        notify(
          nextName
            ? `${result.message} ${nextName} is next in line.`
            : result.message,
        );
      } else {
        router.push("/loans");
        notify(result.message);
      }
    });

  return (
    <>
      {gaveOn ? (
        <Button size="lg" onClick={() => setOpen(true)}>
          Answer
        </Button>
      ) : (
        <Button variant="secondary" size="lg" onClick={() => setOpen(true)}>
          It’s back with me
        </Button>
      )}
      <Sheet open={open} onOpenChange={setOpen} title="Is it back?">
        <div className="flex items-center gap-3">
          <CoverThumb color={color} imageUrl={imageUrl} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">{title}</span>
            {gaveOn && (
              <span className="flex items-center gap-1.25 text-xs">
                <Piece
                  shape={borrower.pieceShape}
                  color={borrower.pieceColor}
                  size={11}
                />
                {borrower.name} says they gave it back{" "}
                {formatDate(gaveOn, today)}
              </span>
            )}
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor={`came-back-${loanId}`}>Came back on</FieldLabel>
          <NativeSelect
            id={`came-back-${loanId}`}
            value={day}
            onChange={(event) => setDay(event.target.value)}
            className="w-full"
          >
            {daysBack(today, pickedUpOn).map((one) => (
              <NativeSelectOption key={one} value={one}>
                {one === today
                  ? `Today, ${formatDate(one, today)}`
                  : formatDate(one, today)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {gaveOn && (
            <FieldDescription>
              The day {borrower.name} gave. Change it if that’s wrong.
            </FieldDescription>
          )}
        </Field>
        {conditionNote && (
          <p className="text-13 leading-snug text-muted-foreground">
            Already noted on this copy: {conditionNote}
            {/[.!?]$/.test(conditionNote) ? "" : "."}
          </p>
        )}
        <Field>
          <FieldLabel htmlFor={`damage-${loanId}`}>
            <span>
              Anything new missing or damaged?
              <span data-ink="smudge" className="font-normal">
                {" · optional"}
              </span>
            </span>
          </FieldLabel>
          <Textarea
            id={`damage-${loanId}`}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <FieldDescription>
            Saved on your copy, so the next borrower knows.
          </FieldDescription>
        </Field>
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <Button size="lg" onClick={() => answer("back")} disabled={pending}>
            Yes, it’s back
          </Button>
          {gaveOn && (
            <div className="flex flex-col items-center gap-0.5">
              <Button
                variant="link"
                onClick={() => answer("not-yet")}
                disabled={pending}
              >
                I don’t have it yet
              </Button>
              <span className="text-xs text-muted-foreground">
                {borrower.name} is told.
              </span>
            </div>
          )}
        </div>
      </Sheet>
    </>
  );
}
