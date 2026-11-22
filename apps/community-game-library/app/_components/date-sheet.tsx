"use client";

import { Button } from "@repo/ui/components/button";
import { useState } from "react";
import { BackIcon, ForwardIcon } from "@/app/_components/icons";
import { Sheet, SheetActions } from "@/app/_components/sheet";
import { formatDate, formatMonth } from "@/src/entities/week";

const WEEKDAYS = [
  { key: "sun", letter: "S" },
  { key: "mon", letter: "M" },
  { key: "tue", letter: "T" },
  { key: "wed", letter: "W" },
  { key: "thu", letter: "T" },
  { key: "fri", letter: "F" },
  { key: "sat", letter: "S" },
];

// Months as "YYYY-MM", worked in UTC so no time zone moves a day (week.ts).
function shiftMonth(month: string, by: number): string {
  const [year = 0, index = 1] = month.split("-").map(Number);
  return new Date(Date.UTC(year, index - 1 + by, 1)).toISOString().slice(0, 7);
}

function daysOf(month: string): string[] {
  const [year = 0, index = 1] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, index, 0)).getUTCDate();
  return Array.from(
    { length: count },
    (_, day) => `${month}-${String(day + 1).padStart(2, "0")}`,
  );
}

function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

// The sheet every date choice opens (X1; R16, R20, R29): a month of days, today marked, and the
// days before `from` switched off (a day before the pick-up, or before the current due date;
// screens.md, When something goes wrong). Dates are "YYYY-MM-DD", and today comes from the
// server (KTD9).
export function DateSheet({
  open,
  onOpenChange,
  title = "Pick a date",
  today,
  from,
  value,
  onPick,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  today: string;
  // The first day that can be picked.
  from?: string;
  value?: string;
  onPick: (date: string) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title}>
      <Month
        today={today}
        from={from}
        value={value}
        onPick={(date) => {
          onPick(date);
          onOpenChange(false);
        }}
      />
    </Sheet>
  );
}

// The sheet's content, which starts afresh each time the sheet opens.
function Month({
  today,
  from,
  value,
  onPick,
}: {
  today: string;
  from?: string;
  value?: string;
  onPick: (date: string) => void;
}) {
  const [month, setMonth] = useState((value ?? from ?? today).slice(0, 7));
  const [chosen, setChosen] = useState(value);
  const days = daysOf(month);
  const firstDay = days[0] ?? `${month}-01`;
  const earliest = from?.slice(0, 7);

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Previous month"
          disabled={earliest !== undefined && month <= earliest}
          onClick={() => setMonth(shiftMonth(month, -1))}
          className="flex size-11 shrink-0 items-center justify-center text-foreground hover:text-destructive"
        >
          <BackIcon />
        </button>
        <span className="text-base font-bold">{formatMonth(month)}</span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setMonth(shiftMonth(month, 1))}
          className="flex size-11 shrink-0 items-center justify-center text-foreground hover:text-destructive"
        >
          <ForwardIcon />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        <div aria-hidden="true" className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map(({ key, letter }) => (
            <span
              key={key}
              data-ink="smudge"
              className="font-mono text-2xs font-medium tracking-wider uppercase"
            >
              {letter}
            </span>
          ))}
        </div>
        <fieldset className="grid min-w-0 grid-cols-7 gap-1">
          <legend className="sr-only">{formatMonth(month)}</legend>
          {WEEKDAYS.slice(0, weekdayOf(firstDay)).map(({ key }) => (
            <span key={`before-${key}`} aria-hidden="true" />
          ))}
          {days.map((day) => {
            const isToday = day === today;
            const label = formatDate(day, today);
            return (
              <button
                key={day}
                type="button"
                aria-label={isToday ? `Today, ${label}` : label}
                aria-pressed={day === chosen}
                aria-current={isToday ? "date" : undefined}
                disabled={from !== undefined && day < from}
                onClick={() => setChosen(day)}
                className="flex h-11 flex-col items-center justify-center gap-0.5 rounded-lg border-2 border-foreground bg-secondary font-mono text-sm leading-none font-medium text-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground"
              >
                {Number(day.slice(8))}
                {isToday && (
                  <span className="text-2xs leading-none">Today</span>
                )}
              </button>
            );
          })}
        </fieldset>
      </div>
      <SheetActions>
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={chosen === undefined}
          onClick={() => {
            if (chosen) onPick(chosen);
          }}
        >
          {chosen ? `Use ${formatDate(chosen, today)}` : "Pick a day"}
        </Button>
      </SheetActions>
    </>
  );
}
