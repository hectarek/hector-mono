"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";
import { CalendarDays } from "lucide-react";
import { useId, useState } from "react";
import { DayPicker } from "@/app/_components/day-picker";
import {
  type MealDays,
  moveCookDay,
  toggleEatDay,
} from "@/src/entities/meal-days";
import { addDays, isIsoDate, shortDay, showsMonth } from "@/src/entities/week";

// A meal's days (docs/ux-plan.md D38): the one day it's cooked, then the days it's eaten, as
// many as it lasts. Eat days are offered for the week from the cook day (the cook day
// selected to start), plus Other for any later day. Moving the cook day moves them too.
export function MealDaysPicker({
  today,
  value,
  onChange,
}: {
  // "YYYY-MM-DD" in the plan's time zone (the server knows it; the phone might not agree).
  today: string;
  value: MealDays;
  onChange: (days: MealDays) => void;
}) {
  const [other, setOther] = useState(false);
  const cookId = useId();
  const eatId = useId();
  const week = Array.from({ length: 7 }, (_, index) =>
    addDays(value.cookDate, index),
  );
  // Days picked with Other, past the week.
  const later = value.eatDates.filter((date) => !week.includes(date));
  const days = [...week, ...later];
  // "Mon Oct 19" needs a wider button than "Mon 19".
  const withMonths = days.some((date) => showsMonth(date, today));

  function cookOn(date: string) {
    if (isIsoDate(date)) onChange(moveCookDay(value, date));
  }

  function toggle(date: string) {
    onChange(toggleEatDay(value, date));
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset
        aria-labelledby={cookId}
        className="flex min-w-0 flex-col gap-2"
      >
        <p id={cookId} className="text-sm font-medium">
          Cook on
        </p>
        <DayPicker today={today} value={value.cookDate} onChange={cookOn} />
      </fieldset>

      <fieldset aria-labelledby={eatId} className="flex min-w-0 flex-col gap-2">
        <p id={eatId} className="text-sm font-medium">
          Eat on
        </p>
        <div
          className={cn(
            "grid gap-2",
            withMonths ? "grid-cols-3" : "grid-cols-4",
          )}
        >
          {days.map((date) => {
            const selected = value.eatDates.includes(date);
            return (
              <Button
                key={date}
                type="button"
                size="lg"
                variant={selected ? "default" : "secondary"}
                aria-pressed={selected}
                onClick={() => toggle(date)}
              >
                {shortDay(date, today)}
              </Button>
            );
          })}
          <Button
            type="button"
            size="lg"
            variant={other ? "default" : "secondary"}
            aria-pressed={other}
            onClick={() => setOther(!other)}
          >
            <CalendarDays data-icon="inline-start" />
            Other
          </Button>
        </div>
        {other && (
          <Input
            type="date"
            aria-label="Another day to eat it"
            min={value.cookDate}
            onChange={(event) => {
              const date = event.target.value;
              if (!isIsoDate(date) || date < value.cookDate) return;
              if (!value.eatDates.includes(date)) toggle(date);
              setOther(false);
            }}
            className="h-9"
          />
        )}
        {value.eatDates.length === 0 && (
          <p className="text-muted-foreground text-sm">
            Pick at least one day to eat it.
          </p>
        )}
      </fieldset>
    </div>
  );
}
