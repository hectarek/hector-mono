"use client";

import { Button } from "@repo/ui/components/button";
import { Switch } from "@repo/ui/components/switch";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useState } from "react";
import { ChartAndTable } from "@/app/_components/calculator/chart-and-table";
import { MoneyField } from "@/app/_components/calculator/money-field";
import { OldBrowserNote } from "@/app/_components/calculator/old-browser-note";
import {
  ResultBody,
  ResultParts,
} from "@/app/_components/calculator/result-parts";
import { ResultSentence } from "@/app/_components/calculator/result-sentence";
import { GROWTH_EXAMPLE, QUICK_RETURNS } from "@/src/finance/assumptions";
import { allocateRounded } from "@/src/finance/format";
import {
  type DepositFrequency,
  describeGrowth,
  type GrowthInput,
  growth,
} from "@/src/finance/growth";
import { checkField, type FieldRule } from "@/src/finance/parse";

const PURPOSE = "to see what it grows to";

// The fields in the order they're shown, which is the order their messages are named in.
const FIELDS = {
  deposit: { unit: "dollars", noun: "a deposit" },
  years: { unit: "years", noun: "how many years" },
  rate: { unit: "percent", noun: "a yearly return" },
  start: { unit: "dollars", noun: "a starting amount" },
  depositYears: {
    unit: "years",
    noun: "how long to keep putting money in",
    optional: true,
  },
  inflation: { unit: "percent", noun: "an inflation rate" },
} as const satisfies Record<string, FieldRule>;

type FieldName = keyof typeof FIELDS;

type Form = {
  text: Record<FieldName, string>;
  frequency: DepositFrequency;
  todaysDollars: boolean;
};

// The prerendered page shows this example's result (R18, KTD12).
const EXAMPLE_FORM: Form = {
  text: {
    deposit: String(GROWTH_EXAMPLE.deposit.value),
    years: String(GROWTH_EXAMPLE.years.value),
    rate: String(GROWTH_EXAMPLE.rate.value),
    start: String(GROWTH_EXAMPLE.start.value),
    depositYears: "",
    inflation: String(GROWTH_EXAMPLE.inflation.value),
  },
  frequency: GROWTH_EXAMPLE.frequency,
  todaysDollars: false,
};

type Reading =
  | { ok: true; input: GrowthInput }
  | { ok: false; problem: string };

function shownFields(form: Form): FieldName[] {
  const names = Object.keys(FIELDS) as FieldName[];
  return form.todaysDollars
    ? names
    : names.filter((name) => name !== "inflation");
}

// The form's inputs, or the first field's fix.
function readForm(form: Form): Reading {
  const values = new Map<FieldName, number | null>();
  for (const name of shownFields(form)) {
    const check = checkField(FIELDS[name], form.text[name], PURPOSE);
    if (!check.ok) return { ok: false, problem: check.problem };
    values.set(name, check.value);
  }
  const value = (name: FieldName) => values.get(name) ?? 0;
  return {
    ok: true,
    input: {
      start: value("start"),
      deposit: value("deposit"),
      frequency: form.frequency,
      years: value("years"),
      depositYears: values.get("depositYears") ?? null,
      rate: value("rate") / 100,
      inflation: form.todaysDollars ? value("inflation") / 100 : null,
    },
  };
}

function exampleInput(): GrowthInput {
  const reading = readForm(EXAMPLE_FORM);
  if (!reading.ok)
    throw new Error(`The example is invalid: ${reading.problem}`);
  return reading.input;
}

// Growth over time (R11): what you put in, what it grew to, and a chart and table by year,
// in dollars as they'll be or in today's dollars. Each valid change recomputes it; while a
// field is invalid the last valid result stays in place, hidden, so the page keeps its shape.
// The state follows recipes' servings scaler, without its URL mirror: nothing typed goes into
// the link (R25).
export function GrowthCalculator() {
  const [form, setForm] = useState(EXAMPLE_FORM);
  const [lastValid, setLastValid] = useState(exampleInput);

  const change = (next: Form) => {
    setForm(next);
    const reading = readForm(next);
    if (reading.ok) setLastValid(reading.input);
  };
  const setText = (name: FieldName, text: string) =>
    change({ ...form, text: { ...form.text, [name]: text } });
  const field = (name: FieldName) => ({
    id: `growth-${name}`,
    rule: FIELDS[name],
    value: form.text[name],
    onValueChange: (text: string) => setText(name, text),
    invalid: !checkField(FIELDS[name], form.text[name], PURPOSE).ok,
  });

  const reading = readForm(form);
  const result = growth(lastValid);
  const today = lastValid.inflation !== null;
  const [putIn = 0, earned = 0] = allocateRounded([
    result.putIn,
    result.earned,
  ]);
  const inToday = today ? ", in today's dollars" : "";

  return (
    <section aria-label="Try it" className="space-y-8">
      <div className="space-y-4">
        <ResultSentence
          message={
            reading.ok ? describeGrowth(lastValid, result) : reading.problem
          }
        />
        <OldBrowserNote />
      </div>

      <div className="space-y-6">
        <MoneyField
          {...field("deposit")}
          label="Deposit"
          example={GROWTH_EXAMPLE.deposit}
          hint="Nothing you type here is saved or sent."
        >
          <ToggleGroup
            aria-label="How often the deposit goes in"
            variant="choice"
            size="lg"
            value={[form.frequency]}
            onValueChange={(values) => {
              const picked = values[0];
              if (picked === "monthly" || picked === "yearly") {
                change({ ...form, frequency: picked });
              }
            }}
          >
            <ToggleGroupItem value="monthly" className="min-h-11">
              Each month
            </ToggleGroupItem>
            <ToggleGroupItem value="yearly" className="min-h-11">
              Each year
            </ToggleGroupItem>
          </ToggleGroup>
        </MoneyField>

        <MoneyField
          {...field("years")}
          label="Years"
          example={GROWTH_EXAMPLE.years}
        />

        <MoneyField
          {...field("rate")}
          label="Yearly return"
          example={GROWTH_EXAMPLE.rate}
        >
          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-2 text-base text-muted-foreground">
              Quick picks, before inflation
            </legend>
            {QUICK_RETURNS.map((pick) => (
              <Button
                key={pick}
                variant="outline"
                size="lg"
                className="min-h-11 min-w-14"
                aria-pressed={form.text.rate === String(pick)}
                onClick={() => setText("rate", String(pick))}
              >
                {pick}%
              </Button>
            ))}
          </fieldset>
        </MoneyField>

        <MoneyField
          {...field("start")}
          label="Starting amount"
          example={GROWTH_EXAMPLE.start}
          hint="Money you already have, put in on day one."
        />

        <MoneyField
          {...field("depositYears")}
          label="Keep putting money in for"
          example={null}
          hint="Leave it empty to put money in every year."
        />

        <div className="space-y-2">
          {/* A native button with a sibling label (Base UI's pattern for htmlFor), so the
              label is tied to a control Biome can see. The label is the 44px tap target. */}
          <div className="flex items-center gap-3">
            <Switch
              id="growth-todays-dollars"
              nativeButton
              render={<button type="button" />}
              checked={form.todaysDollars}
              onCheckedChange={(checked) =>
                change({ ...form, todaysDollars: checked })
              }
            />
            <label
              htmlFor="growth-todays-dollars"
              className="flex min-h-11 items-center font-semibold"
            >
              Show in today&apos;s dollars
            </label>
          </div>
          <p className="text-base text-muted-foreground">
            Prices rise over time. That&apos;s inflation, and it means a dollar
            buys less later. Today&apos;s dollars shows each amount as what it
            would buy now.
          </p>
        </div>

        {form.todaysDollars && (
          <MoneyField
            {...field("inflation")}
            label="Inflation a year"
            example={GROWTH_EXAMPLE.inflation}
          />
        )}
      </div>

      <ResultBody hidden={!reading.ok}>
        <div className="space-y-3">
          <ResultParts
            parts={[
              { label: `What you put in${inToday}`, amount: putIn },
              earned < 0
                ? { label: "What inflation took", amount: earned }
                : {
                    label: today
                      ? "What it earned, after inflation"
                      : "What it earned",
                    amount: earned,
                  },
            ]}
            totalLabel={`What it grew to${inToday}`}
          />
          <p className="text-base text-muted-foreground">
            This is an estimate. Real returns go up and down from year to year.
          </p>
        </div>
        <ChartAndTable
          caption={`Year by year${inToday}`}
          rowHeader="Year"
          series={[
            {
              key: "putIn",
              label: "What you put in",
              color: "var(--muted-foreground)",
              dashed: true,
            },
            { key: "total", label: "What it grew to", color: "var(--primary)" },
          ]}
          rows={result.byYear.map((row) => ({
            label: row.year === 0 ? "Start" : String(row.year),
            values: [row.putIn, row.total],
          }))}
        />
      </ResultBody>
    </section>
  );
}
