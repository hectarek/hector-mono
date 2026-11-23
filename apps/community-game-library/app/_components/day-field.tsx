"use client";

import { Field, FieldDescription, FieldLabel } from "@repo/ui/components/field";
import { useState } from "react";
import { DateSheet } from "@/app/_components/date-sheet";
import { CalendarIcon } from "@/app/_components/icons";
import { formatDate } from "@/src/entities/week";

// A day that already happened, picked on the date sheet (X1): C3's Picked up on and C5's Gave it
// back on. It reads "Today, Tue, Nov 10" until another day is picked. Inside a group whose label
// names it already (C9), its own label is for screen readers only.
export function DayField({
  id,
  label,
  labelHidden = false,
  hint,
  today,
  from,
  until,
  value,
  onChange,
}: {
  id: string;
  label: string;
  labelHidden?: boolean;
  hint?: string;
  today: string;
  from?: string;
  until?: string;
  value: string;
  onChange: (day: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const words = formatDate(value, today);
  return (
    <Field>
      <FieldLabel htmlFor={id} className={labelHidden ? "sr-only" : undefined}>
        {label}
      </FieldLabel>
      <button
        id={id}
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center justify-between gap-2 rounded-lg border-2 border-foreground bg-secondary px-3 text-left text-15 text-foreground"
      >
        {value === today ? `Today, ${words}` : words}
        <CalendarIcon className="shrink-0" />
      </button>
      {hint && <FieldDescription>{hint}</FieldDescription>}
      <DateSheet
        open={open}
        onOpenChange={setOpen}
        title={label}
        today={today}
        from={from}
        until={until}
        value={value}
        onPick={onChange}
      />
    </Field>
  );
}
