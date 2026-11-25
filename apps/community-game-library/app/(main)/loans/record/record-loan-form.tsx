"use client";

import { Button } from "@repo/ui/components/button";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChangedNotice } from "@/app/_components/changed-notice";
import { CoverThumb } from "@/app/_components/cover-thumb";
import { DateSheet } from "@/app/_components/date-sheet";
import { DayField } from "@/app/_components/day-field";
import { Group } from "@/app/_components/group";
import { IconCombobox } from "@/app/_components/icon-combobox";
import { Piece } from "@/app/_components/piece";
import { callResultAction } from "@/app/_lib/call-action";
import { notify } from "@/app/_lib/notify";
import { recordLoan } from "@/app/actions/loans";
import type { ActionState } from "@/app/actions/shared";
import type { DI_RETURN_TYPES } from "@/di/types";
import { dueOn as dueAfter } from "@/src/entities/loan";
import type { NameAndPiece } from "@/src/entities/models/user-profile.model";
import { coverColorOf } from "@/src/entities/piece";
import { addDays, formatDate } from "@/src/entities/week";

type Choices = Awaited<
  ReturnType<DI_RETURN_TYPES["IGetRecordLoanChoicesController"]>
>;
type Period = "7" | "14" | "30" | "date";

const PERIODS: { value: Period; words: string }[] = [
  { value: "7", words: "1 week" },
  { value: "14", words: "2 weeks" },
  { value: "30", words: "A month" },
  { value: "date", words: "Pick a date" },
];

// How far back a loan made face to face can start.
const EARLIEST_DAYS = 60;

// Record a loan's form (C9): the game, a copy of the member's that's home, by its cover; who's
// taking it, a friend by their piece, nobody until one is picked, and first the friend who asked
// for the game picked, "asked for it"; the day it was picked up, today or earlier; and a week,
// two weeks, a month or a picked date, with the due date that gives. Record the loan goes on to
// Loans, where it's out. Each radio's label sits beside it: a Base UI control inside its own label
// flips twice on one click in happy-dom.
export function RecordLoanForm({
  copies,
  friends,
  today,
}: {
  copies: Choices["copies"];
  friends: readonly NameAndPiece[];
  today: string;
}) {
  const router = useRouter();
  const [userGameId, setUserGameId] = useState(copies[0]?.userGameId ?? "");
  const [takerId, setTakerId] = useState("");
  const [day, setDay] = useState(today);
  const [period, setPeriod] = useState<Period>("14");
  const [picked, setPicked] = useState<string>();
  const [picking, setPicking] = useState(false);
  const [state, setState] = useState<ActionState>(null);
  const [pending, startTransition] = useTransition();
  const friend = friends.find((one) => one.userId === takerId) ?? null;
  const due = period === "date" ? picked : dueAfter(day, Number(period));
  const askerId = copies.find((copy) => copy.userGameId === userGameId)?.askedBy
    ?.userId;
  const games = copies.map((copy) => ({
    value: copy.userGameId,
    label: copy.game.title,
    icon: (
      <CoverThumb
        color={coverColorOf(copy.game)}
        imageUrl={copy.game.imageUrl}
        size={32}
      />
    ),
    note: copy.askedBy ? `${copy.askedBy.name} asked for it` : undefined,
  }));
  const takers = [
    ...friends.filter((one) => one.userId === askerId),
    ...friends.filter((one) => one.userId !== askerId),
  ].map((one) => ({
    value: one.userId,
    label: one.name,
    icon: <Piece shape={one.pieceShape} color={one.pieceColor} size={16} />,
    note: one.userId === askerId ? "asked for it" : undefined,
  }));

  const send = () => {
    if (!friend || !due) {
      return;
    }
    startTransition(async () => {
      const result = await callResultAction(() =>
        recordLoan(
          {
            userGameId,
            borrowerUserId: friend.userId,
            pickedUpOn: day,
            ...(period === "date"
              ? { dueOn: due }
              : { periodDays: Number(period) }),
          },
          friend.name,
        ),
      );
      if (result && "message" in result && result.message) {
        router.push("/loans");
        notify(result.message);
        return;
      }
      setState(result && "ok" in result ? { error: result.error } : result);
    });
  };

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <Group label="Game">
        <IconCombobox
          id="record-game"
          label="Game"
          labelHidden
          name="userGameId"
          noun="game"
          options={games}
          value={userGameId}
          onChange={setUserGameId}
        />
      </Group>
      <Group label="Who’s taking it">
        <IconCombobox
          id="record-taker"
          label="Who’s taking it"
          labelHidden
          name="borrowerUserId"
          noun="friend"
          options={takers}
          value={takerId}
          onChange={setTakerId}
        />
      </Group>
      <Group label="Picked up on">
        <DayField
          id="record-day"
          label="Picked up on"
          labelHidden
          hint="Set an earlier day if it’s already out."
          today={today}
          from={addDays(today, -EARLIEST_DAYS)}
          until={today}
          value={day}
          onChange={setDay}
        />
      </Group>
      <Group label="Lend for">
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
          {PERIODS.map((one) => (
            <div key={one.value} className="flex items-center gap-2.5">
              <RadioGroupItem id={`record-${one.value}`} value={one.value} />
              <label
                htmlFor={`record-${one.value}`}
                className="flex min-h-11 flex-1 items-center text-15"
              >
                {one.value === "date" && picked
                  ? `Until ${formatDate(picked, today)}`
                  : one.words}
              </label>
            </div>
          ))}
        </RadioGroup>
        {period === "date" && (
          <Button
            type="button"
            variant="link"
            className="self-start"
            onClick={() => setPicking(true)}
          >
            {picked ? "Change the date" : "Pick the date"}
          </Button>
        )}
        {due && (
          <p className="text-13 leading-snug text-muted-foreground">
            {day === today
              ? "Picked up today"
              : `Picked up ${formatDate(day, today)}`}
            , so it’s due {formatDate(due, today)}.
          </p>
        )}
      </Group>
      {state?.changed ? (
        <ChangedNotice reason={state.changed} />
      ) : (
        <div className="flex flex-col gap-1.5">
          {state?.error && (
            <p role="alert" className="text-xs text-destructive">
              {state.error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={pending || !friend || !due}>
            Record the loan
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            {friend?.name ?? "Your friend"} is told, and it shows on their
            Loans. They don’t confirm.
          </p>
        </div>
      )}
      <DateSheet
        open={picking}
        onOpenChange={setPicking}
        today={today}
        from={addDays(today, 1)}
        value={picked}
        onPick={(date) => {
          setPicked(date);
          setPicking(false);
        }}
      />
    </form>
  );
}
