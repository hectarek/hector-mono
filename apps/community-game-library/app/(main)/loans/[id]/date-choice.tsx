"use client";

import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { useState } from "react";
import { DateSheet } from "@/app/_components/date-sheet";
import { MORE_TIME_DAYS } from "@/src/entities/loan";
import { addDays, formatDate } from "@/src/entities/week";

type Choice = "3" | "7" | "date";

// C6's How much longer? and C14's New due date: 3 more days or 1 more week from `from` (the due
// date, or today once it's overdue), each with the day it gives, or a date after it picked on the
// date sheet (X1). Each label sits beside its radio: a Base UI control inside its own label flips
// twice on one click in happy-dom.
export function DateChoice({
  id,
  legend,
  from,
  today,
  onChange,
}: {
  id: string;
  legend: string;
  from: string;
  today: string;
  // The day chosen, or undefined while Pick a date has none yet.
  onChange: (day: string | undefined) => void;
}) {
  const [choice, setChoice] = useState<Choice>("7");
  const [picked, setPicked] = useState<string>();
  const [picking, setPicking] = useState(false);
  const dayOf = (days: number) => addDays(from, days);

  const choose = (next: Choice) => {
    setChoice(next);
    if (next === "date") {
      onChange(picked);
      setPicking(true);
    } else {
      onChange(dayOf(Number(next)));
    }
  };

  const option = (value: Choice, words: string, day?: string) => (
    <div key={value} className="flex items-center gap-2.5">
      <RadioGroupItem id={`${id}-${value}`} value={value} />
      <label
        htmlFor={`${id}-${value}`}
        className="flex min-h-11 flex-1 items-center justify-between gap-2 text-15"
      >
        {words}
        {day && (
          <span className="font-mono text-xs font-medium text-muted-foreground">
            {formatDate(day, today)}
          </span>
        )}
      </label>
    </div>
  );

  return (
    <fieldset className="flex min-w-0 flex-col">
      <legend className="mb-1.5 text-13 font-semibold">{legend}</legend>
      <RadioGroup
        aria-label={legend}
        value={choice}
        onValueChange={(next) => {
          if (next === "3" || next === "7" || next === "date") {
            choose(next);
          }
        }}
      >
        {MORE_TIME_DAYS.map((days) =>
          option(
            String(days) as Choice,
            days === 3 ? "3 more days" : "1 more week",
            dayOf(days),
          ),
        )}
        {option("date", picked ? "Until" : "Pick a date", picked)}
      </RadioGroup>
      <DateSheet
        open={picking}
        onOpenChange={setPicking}
        today={today}
        from={addDays(from, 1)}
        value={picked}
        onPick={(day) => {
          setPicked(day);
          onChange(day);
        }}
      />
    </fieldset>
  );
}
