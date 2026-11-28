import { Input } from "@repo/ui/components/input";
import type { ReactNode } from "react";
import type { Example } from "@/src/finance/assumptions";
import {
  formatDate,
  formatDollars,
  formatPercent,
  formatYears,
} from "@/src/finance/format";
import { type FieldRule, type FieldUnit, rangeText } from "@/src/finance/parse";

type MoneyFieldProps = {
  id: string;
  label: string;
  rule: FieldRule;
  value: string;
  onValueChange: (text: string) => void;
  invalid: boolean;
  // The example value with its source and the day it was checked (R15), or null for a field
  // whose example is to leave it empty (its hint says so).
  example: Example | null;
  // A line under the example: the promise beside the first field (R25), or what an empty
  // optional field means.
  hint?: ReactNode;
  // Controls that belong to the field, under it: how often a deposit goes in, quick picks.
  children?: ReactNode;
};

// One calculator field: its label and range together, its unit beside the input as plain text
// (not an InputGroup addon, whose fixed height would need its own size; KTD16), and its
// example's source and date on one line under it. A plain text field with a decimal keypad,
// outside any form, so Enter submits nothing and nothing typed goes anywhere (KTD12).
export function MoneyField({
  id,
  label,
  rule,
  value,
  onValueChange,
  invalid,
  example,
  hint,
  children,
}: MoneyFieldProps) {
  const described = [
    `${id}-range`,
    example && `${id}-example`,
    hint && `${id}-hint`,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <label htmlFor={id} className="font-semibold">
          {label}
        </label>
        <span id={`${id}-range`} className="text-base text-muted-foreground">
          From {rangeText(rule.unit)}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {rule.unit === "dollars" && <span>$</span>}
        <Input
          id={id}
          data-size="lg"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          aria-invalid={invalid || undefined}
          aria-describedby={described}
          className="max-w-40"
        />
        {rule.unit === "percent" && <span>%</span>}
        {rule.unit === "years" && <span>years</span>}
      </div>
      {children}
      {example && (
        <p id={`${id}-example`} className="text-base text-muted-foreground">
          <ExampleLine example={example} unit={rule.unit} />
        </p>
      )}
      {hint && (
        <p id={`${id}-hint`} className="text-base text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

function ExampleLine({ example, unit }: { example: Example; unit: FieldUnit }) {
  return (
    <>
      Example: {shownValue(example.value, unit)}
      {example.judgment && ", a starting guess"}
      {example.note && `, ${example.note}`}
      {example.source && (
        <>
          {" ("}
          <a href={example.source.url} className="underline underline-offset-4">
            {example.source.name}
          </a>
          )
        </>
      )}
      . Checked {formatDate(example.checked)}.
    </>
  );
}

function shownValue(value: number, unit: FieldUnit): string {
  if (unit === "dollars") return formatDollars(value);
  if (unit === "percent") return formatPercent(value);
  return formatYears(value);
}
