"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import { useState, useTransition } from "react";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { askMoreTime } from "@/app/actions/loans";
import type { CoverColor } from "@/src/entities/piece";
import { addDays, formatDate } from "@/src/entities/week";
import { DateChoice } from "./date-choice";

// C5's Ask for more time and its sheet (C6, R20): how much longer, from the due date (or today once
// it's overdue), a note to the owner, and who's in line, since the owner may say no for them.
export function MoreTimeSheet({
  loanId,
  title,
  color,
  imageUrl,
  dueOn,
  from,
  owner,
  nextName,
  today,
}: {
  loanId: string;
  title: string;
  color: CoverColor;
  imageUrl: string | null;
  dueOn: string;
  // The day the choices count from: the due date, or today once it's overdue.
  from: string;
  owner: string;
  nextName: string | null;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<string | undefined>(addDays(from, 7));
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const send = () =>
    startTransition(async () => {
      if (!day) return;
      setError(undefined);
      const result = await callResultAction(() =>
        askMoreTime(loanId, { dueOn: day, note }, owner),
      );
      if (result && "message" in result && result.message) {
        setOpen(false);
        notify(result.message);
        return;
      }
      setError(result?.error ?? undefined);
    });

  return (
    <>
      <Button
        variant="link"
        className="self-center"
        onClick={() => setOpen(true)}
      >
        Ask for more time
      </Button>
      <Sheet open={open} onOpenChange={setOpen} title="Ask for more time">
        <div className="flex items-center gap-3">
          <CoverThumb color={color} imageUrl={imageUrl} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">{title}</span>
            <span className="font-mono text-2xs font-medium text-muted-foreground">
              Due {formatDate(dueOn, today)}
            </span>
          </div>
        </div>
        <DateChoice
          id={`more-time-${loanId}`}
          legend="How much longer?"
          from={from}
          today={today}
          onChange={setDay}
        />
        <Field>
          <FieldLabel htmlFor={`more-time-note-${loanId}`}>
            <span>
              Note for {owner}
              <span data-ink="smudge" className="font-normal">
                {" · optional"}
              </span>
            </span>
          </FieldLabel>
          <Textarea
            id={`more-time-note-${loanId}`}
            rows={2}
            maxLength={500}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
        {nextName && (
          <p data-ink="smudge" className="text-13 leading-snug">
            {nextName} is in line, so {owner} may say no.
          </p>
        )}
        {error && (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        )}
        <SheetActions>
          <Button size="lg" onClick={send} disabled={pending || !day}>
            Ask {owner}
          </Button>
        </SheetActions>
      </Sheet>
    </>
  );
}
