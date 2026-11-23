"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Textarea } from "@repo/ui/components/textarea";
import { useState, useTransition } from "react";
import { ChangedNotice } from "@/app/_components/changed-notice";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { DateSheet } from "@/app/_components/date-sheet";
import { LoanTrack } from "@/app/_components/loan-track";
import { Piece } from "@/app/_components/piece";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { answerMoreTime } from "@/app/actions/loans";
import type { ActionState } from "@/app/actions/shared";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import type { CoverColor } from "@/src/entities/piece";
import { addDays, daysBetween, formatDate } from "@/src/entities/week";

type Answer = "asked" | "own" | "no";

// C7's Answer, and the sheet it opens (C13, R20): the date the borrower asked for and their note,
// the track, who in line waits longer, then Yes until that date, Yes but pick a date, or No, it
// stays due, with a note. Each label sits beside its radio: a Base UI control inside its own label
// flips twice on one click in happy-dom.
export function MoreTimeAnswer({
  loanId,
  title,
  color,
  imageUrl,
  borrower,
  pickedUpOn,
  dueOn,
  askedFor,
  askedNote,
  nextName,
  today,
}: {
  loanId: string;
  title: string;
  color: CoverColor;
  imageUrl: string | null;
  borrower: NameAndPiece;
  pickedUpOn: string;
  dueOn: string;
  askedFor: string;
  askedNote: string | null;
  nextName: string | null;
  today: string;
}) {
  const [open, setOpen] = useState(false);
  const [answer, setAnswer] = useState<Answer>("asked");
  const [own, setOwn] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const late = daysBetween(dueOn, today);

  const send = () =>
    startTransition(async () => {
      const input =
        answer === "no"
          ? ({ answer: "no", note } as const)
          : answer === "own" && own
            ? ({ answer: "yes", dueOn: own, note } as const)
            : ({ answer: "yes", note } as const);
      const result = await callResultAction(() =>
        answerMoreTime(loanId, input, borrower.name),
      );
      if (result && "message" in result && result.message) {
        setOpen(false);
        notify(result.message);
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });

  const option = (value: Answer, words: string, help?: string) => (
    <div key={value} className="flex items-center gap-2.5">
      <RadioGroupItem id={`more-time-${loanId}-${value}`} value={value} />
      <label
        htmlFor={`more-time-${loanId}-${value}`}
        className="flex min-h-11 flex-1 flex-col justify-center text-15"
      >
        {words}
        {help && (
          <span className="font-mono text-2xs font-medium text-muted-foreground">
            {help}
          </span>
        )}
      </label>
    </div>
  );

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)}>
        Answer
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title={`${borrower.name} asked for more time`}
      >
        <div className="flex items-center gap-3">
          <CoverThumb color={color} imageUrl={imageUrl} />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">{title}</span>
            <span className="font-mono text-2xs font-medium text-muted-foreground">
              Due {formatDate(dueOn, today)}
              {late > 0 && ` · ${late} ${late === 1 ? "day" : "days"} overdue`}
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <Piece
            shape={borrower.pieceShape}
            color={borrower.pieceColor}
            size={20}
          />
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-15 font-bold">
              Until {formatDate(askedFor, today)}
            </span>
            {askedNote && <span className="text-15">“{askedNote}”</span>}
          </div>
        </div>
        <LoanTrack
          pickedUpOn={pickedUpOn}
          dueOn={dueOn}
          today={today}
          borrower={borrower}
        />
        {nextName && (
          <p data-ink="smudge" className="text-13 leading-snug">
            {nextName} is 1st in line and waits longer if you say yes.
          </p>
        )}
        {state?.changed ? (
          <ChangedNotice reason={state.changed} />
        ) : (
          <>
            <RadioGroup
              aria-label="Your answer"
              value={answer}
              onValueChange={(next) => {
                if (next === "asked" || next === "no") {
                  setAnswer(next);
                } else if (next === "own") {
                  setAnswer(next);
                  setPicking(true);
                }
              }}
            >
              {option(
                "asked",
                `Yes, until ${formatDate(askedFor, today)}`,
                `What ${borrower.name} asked for`,
              )}
              {option(
                "own",
                own
                  ? `Yes, until ${formatDate(own, today)}`
                  : "Yes, but pick a date",
              )}
              {option("no", `No, it stays due ${formatDate(dueOn, today)}`)}
            </RadioGroup>
            <Field>
              <FieldLabel htmlFor={`more-time-answer-note-${loanId}`}>
                <span>
                  Note for {borrower.name}
                  <span data-ink="smudge" className="font-normal">
                    {" · optional"}
                  </span>
                </span>
              </FieldLabel>
              <Textarea
                id={`more-time-answer-note-${loanId}`}
                rows={2}
                maxLength={500}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
            {state?.error && (
              <p role="alert" className="text-xs text-destructive">
                {state.error}
              </p>
            )}
            <SheetActions>
              <Button
                size="lg"
                onClick={send}
                disabled={pending || (answer === "own" && !own)}
              >
                Send answer
              </Button>
            </SheetActions>
          </>
        )}
        <DateSheet
          open={picking}
          onOpenChange={setPicking}
          today={today}
          from={addDays(today, 1)}
          value={own}
          onPick={setOwn}
        />
      </Sheet>
    </>
  );
}
