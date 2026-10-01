"use client";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { upcomingDays } from "@/src/entities/week";

// Which day a meal goes on: the coming week as one-tap buttons (the usual case), and
// Other for scheduling further out, which opens the phone's date picker.
export function DayPicker({
  today,
  value,
  onChange,
}: {
  // "YYYY-MM-DD" in the plan's time zone (the server knows it; the phone might not agree).
  today: string;
  value: string;
  onChange: (date: string) => void;
}) {
  const days = upcomingDays(today);
  const [other, setOther] = useState(
    () => !days.some((day) => day.date === value),
  );

  return (
    <div className="flex flex-col gap-2">
      <fieldset className="grid grid-cols-4 gap-2">
        <legend className="sr-only">Day</legend>
        {days.map((day) => {
          const selected = !other && day.date === value;
          return (
            <Button
              key={day.date}
              type="button"
              size="lg"
              variant={selected ? "default" : "outline"}
              aria-pressed={selected}
              onClick={() => {
                setOther(false);
                onChange(day.date);
              }}
            >
              {day.label}
            </Button>
          );
        })}
        <Button
          type="button"
          size="lg"
          variant={other ? "default" : "outline"}
          aria-pressed={other}
          onClick={() => setOther(true)}
        >
          <CalendarDays data-icon="inline-start" />
          Other
        </Button>
      </fieldset>
      {other && (
        <Input
          type="date"
          aria-label="Date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          className="h-9"
        />
      )}
    </div>
  );
}
