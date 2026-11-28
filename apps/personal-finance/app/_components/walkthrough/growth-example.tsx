"use client";

import { useState } from "react";
import { MoneyField } from "@/app/_components/calculator/money-field";
import { ResultSentence } from "@/app/_components/calculator/result-sentence";
import { formatDollars } from "@/src/finance/format";
import {
  DEPOSIT_RULE,
  type DepositFrequency,
  GROWTH_PURPOSE,
  growth,
  roundedGrowth,
} from "@/src/finance/growth";
import { checkField } from "@/src/finance/parse";

// One of the talk's growth examples, live (R8): it opens on the talk's numbers, offers one field,
// the deposit, so the step keeps to three things on screen (R6), and runs the same math as
// /compound-growth, so the two never disagree. Swipes that start on it don't change the step.
export function GrowthExample({
  id,
  deposit,
  frequency,
  depositYears,
  years,
  yearlyReturn,
  startAge,
}: {
  id: string;
  deposit: number;
  frequency: DepositFrequency;
  depositYears: number;
  years: number;
  yearlyReturn: number;
  startAge: number;
}) {
  const [text, setText] = useState(deposit.toLocaleString("en-US"));
  const check = checkField(DEPOSIT_RULE, text, GROWTH_PURPOSE);

  let sentence: string;
  if (check.ok) {
    const result = growth({
      start: 0,
      deposit: check.value ?? 0,
      frequency,
      years,
      depositYears,
      rate: yearlyReturn,
      inflation: null,
    });
    const { putIn, total } = roundedGrowth(result);
    sentence = `At ${startAge + years}, you'd have about ${formatDollars(total)}, from ${formatDollars(putIn)} you put in.`;
  } else {
    sentence = check.problem;
  }

  return (
    <div data-swipe-ignore className="space-y-4 rounded-lg border bg-card p-4">
      <ResultSentence message={sentence} />
      <MoneyField
        id={`${id}-deposit`}
        label={
          frequency === "monthly"
            ? "Each month you put in"
            : "Each year you put in"
        }
        rule={DEPOSIT_RULE}
        value={text}
        onValueChange={setText}
        invalid={!check.ok}
        example={null}
      />
    </div>
  );
}
