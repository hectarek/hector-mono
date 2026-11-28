"use client";

import { useState } from "react";
import { MoneyField } from "@/app/_components/calculator/money-field";
import { ResultSentence } from "@/app/_components/calculator/result-sentence";
import { allocateRounded, formatDollars } from "@/src/finance/format";
import { growth } from "@/src/finance/growth";
import { checkField, type FieldRule } from "@/src/finance/parse";

const DEPOSIT: FieldRule = { unit: "dollars", noun: "a deposit" };

// One of the talk's growth examples, live (R8): it opens on the talk's numbers, offers one field,
// the deposit, so the step keeps to three things on screen (R6), and runs the same math as
// /compound-growth, so the two never disagree. Swipes that start on it don't change the step.
export function GrowthExample({
  id,
  deposit,
  every,
  depositYears,
  years,
  yearlyReturn,
  startAge,
}: {
  id: string;
  deposit: number;
  every: "year" | "month";
  depositYears: number;
  years: number;
  yearlyReturn: number;
  startAge: number;
}) {
  const [text, setText] = useState(deposit.toLocaleString("en-US"));
  const check = checkField(DEPOSIT, text, "to see what it grows to");

  let sentence: string;
  if (check.ok) {
    const result = growth({
      start: 0,
      deposit: check.value ?? 0,
      frequency: every === "month" ? "monthly" : "yearly",
      years,
      depositYears,
      rate: yearlyReturn,
      inflation: null,
    });
    const [putIn = 0, earned = 0] = allocateRounded([
      result.putIn,
      result.earned,
    ]);
    sentence = `At ${startAge + years}, you'd have about ${formatDollars(putIn + earned)}, from ${formatDollars(putIn)} you put in.`;
  } else {
    sentence = check.problem;
  }

  return (
    <div data-swipe-ignore className="space-y-4 rounded-lg border bg-card p-4">
      <ResultSentence message={sentence} />
      <MoneyField
        id={`${id}-deposit`}
        label={
          every === "month" ? "Each month you put in" : "Each year you put in"
        }
        rule={DEPOSIT}
        value={text}
        onValueChange={setText}
        invalid={!check.ok}
        example={null}
      />
    </div>
  );
}
