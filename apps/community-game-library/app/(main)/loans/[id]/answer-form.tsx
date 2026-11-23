"use client";

import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { Textarea } from "@repo/ui/components/textarea";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChangedNotice } from "@/app/_components/changed-notice";
import { DateSheet } from "@/app/_components/date-sheet";
import { Group } from "@/app/_components/group";
import { callResultAction } from "@/app/_lib/call-action";
import { useLeaveGuard } from "@/app/_lib/leave-guard";
import { notify } from "@/app/_lib/notify";
import { answerRequest, type RequestAnswerInput } from "@/app/actions/loans";
import type { ActionState } from "@/app/actions/shared";
import { addDays, formatDate } from "@/src/entities/week";

type Answer = "yes" | "no";
type Period = "7" | "14" | "30" | "date";

const PERIODS: { value: Period; words: string }[] = [
  { value: "7", words: "1 week" },
  { value: "14", words: "2 weeks" },
  { value: "30", words: "A month" },
  { value: "date", words: "Pick a date" },
];

// C2's Your answer: Yes, lend it, for a week, two weeks, a month or until a picked date, or No,
// not this time, then an optional note to the borrower and Send answer. A yes stays here, and the
// page reads as C17; a no goes on to Loans. Each label sits beside its radio: a Base UI control
// inside its own label flips twice on one click in happy-dom.
export function AnswerForm({
  loanId,
  borrower,
  today,
}: {
  loanId: string;
  borrower: string;
  today: string;
}) {
  const router = useRouter();
  const [answer, setAnswer] = useState<Answer>("yes");
  const [period, setPeriod] = useState<Period>("14");
  const [dueOn, setDueOn] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [note, setNote] = useState("");
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  useLeaveGuard(note.trim() !== "" && !pending);

  const ready = answer === "no" || period !== "date" || dueOn !== undefined;
  const send = () => {
    const input: RequestAnswerInput =
      answer === "no"
        ? { answer, note }
        : period === "date"
          ? { answer, dueOn: dueOn ?? "", note }
          : { answer, periodDays: Number(period), note };
    startTransition(async () => {
      const result = await callResultAction(() =>
        answerRequest(loanId, input, borrower),
      );
      if (result && "message" in result && result.message) {
        notify(result.message);
        if (answer === "no") {
          router.push("/loans");
        }
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });
  };

  const radio = (id: string, value: string, words: string) => (
    <div key={id} className="flex items-center gap-2.5">
      <RadioGroupItem id={id} value={value} />
      <label htmlFor={id} className="flex min-h-11 flex-1 items-center text-15">
        {words}
      </label>
    </div>
  );

  if (state?.changed) {
    return (
      <Group label="Your answer">
        <ChangedNotice reason={state.changed} />
      </Group>
    );
  }
  return (
    <>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <Group label="Your answer">
          <RadioGroup
            aria-label="Your answer"
            value={answer}
            onValueChange={(next) => {
              if (next === "yes" || next === "no") {
                setAnswer(next);
              }
            }}
          >
            {radio("answer-yes", "yes", "Yes, lend it")}
            {answer === "yes" && (
              <fieldset className="mb-2 ml-8.5 flex flex-col">
                <legend className="text-13 font-semibold">Lend for</legend>
                <RadioGroup
                  aria-label="Lend for"
                  value={period}
                  onValueChange={(next) => {
                    const found = PERIODS.find((one) => one.value === next);
                    if (found) {
                      setPeriod(found.value);
                      if (found.value === "date") {
                        setPicking(true);
                      }
                    }
                  }}
                >
                  {PERIODS.map((one) =>
                    radio(
                      `period-${one.value}`,
                      one.value,
                      one.value === "date" && dueOn
                        ? `Until ${formatDate(dueOn, today)}`
                        : one.words,
                    ),
                  )}
                </RadioGroup>
                {period === "date" && (
                  <Button
                    type="button"
                    variant="link"
                    className="self-start"
                    onClick={() => setPicking(true)}
                  >
                    {dueOn ? "Change the date" : "Pick the date"}
                  </Button>
                )}
                <span className="font-mono text-2xs font-medium text-muted-foreground">
                  Counts from the day {borrower} picks it up.
                </span>
              </fieldset>
            )}
            {radio("answer-no", "no", "No, not this time")}
          </RadioGroup>
          <Field data-invalid={state?.fields?.note ? "true" : undefined}>
            <FieldLabel htmlFor="lend-note">
              <span>
                Note for {borrower}
                <span data-ink="smudge" className="font-normal">
                  {" · optional"}
                </span>
              </span>
            </FieldLabel>
            <Textarea
              id="lend-note"
              name="note"
              rows={2}
              maxLength={500}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
            {state?.fields?.note && (
              <FieldError>{state.fields.note}</FieldError>
            )}
          </Field>
          {state?.error && !state.fields?.note && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending || !ready}>
            Send answer
          </Button>
        </Group>
      </form>
      <DateSheet
        open={picking}
        onOpenChange={setPicking}
        today={today}
        from={addDays(today, 1)}
        value={dueOn}
        onPick={(date) => {
          setDueOn(date);
          setPicking(false);
        }}
      />
    </>
  );
}
