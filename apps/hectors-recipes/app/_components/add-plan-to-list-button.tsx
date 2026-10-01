"use client";

import { Button } from "@repo/ui/components/button";
import {
  NativeSelect,
  NativeSelectOption,
} from "@repo/ui/components/native-select";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  changedList,
  describeAddResult,
} from "@/app/_components/add-to-list-button";
import { type AddToListState, addPlanToList } from "@/app/actions/grocery";
import {
  type AddToListResult,
  DEFAULT_GROCERY_RANGE,
  GROCERY_RANGES,
  type GroceryRange,
  groceryRangeDays,
} from "@/src/entities/models/grocery-item.model";

const RANGE_LABELS: Record<GroceryRange, string> = {
  "next-3-days": "Next 3 days",
  "next-7-days": "Next 7 days",
  "next-14-days": "Next 14 days",
  "all-upcoming": "All upcoming",
};

// How a range reads in a sentence: "for the next 7 days".
function rangeText(range: GroceryRange): string {
  return range === "all-upcoming"
    ? "from today on"
    : `for the ${RANGE_LABELS[range].toLowerCase()}`;
}

// What the button did, including the meals it found already on the list (D45).
export function describePlanResult(result: AddToListResult): string {
  const already = result.alreadyAdded;
  const note = already
    ? `${already === 1 ? "1 meal was" : `${already} meals were`} already on the list.`
    : "";
  if (!changedList(result)) return note || "Nothing new to add.";
  return note
    ? `${describeAddResult(result)} ${note}`
    : describeAddResult(result);
}

// The plan's grocery button (docs/ux-plan.md D41, D44): the meals cooking in the range picked
// above it that aren't on the list yet, onto the plan's own list.
export function AddPlanToListButton({
  planId,
  today,
  cookDays,
}: {
  planId: string;
  // "YYYY-MM-DD" in the plan's time zone.
  today: string;
  // The cook days of meals not cooked and not on the list, from today on.
  cookDays: string[];
}) {
  const [range, setRange] = useState<GroceryRange>(DEFAULT_GROCERY_RANGE);
  const [result, setResult] = useState<AddToListState>(null);
  const [isPending, startTransition] = useTransition();
  const resultRef = useRef<HTMLParagraphElement>(null);
  const rangeId = useId();
  const { to } = groceryRangeDays(range, today);
  const count = cookDays.filter((day) => to === null || day <= to).length;

  // The pressed button goes once nothing is left to add, so the cursor moves to what it did.
  useEffect(() => {
    if (result?.ok && count === 0) resultRef.current?.focus();
  }, [result, count]);

  function add() {
    startTransition(async () =>
      setResult(await addPlanToList({ planId, range })),
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border p-3">
      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor={rangeId}>Shopping for</label>
        <NativeSelect
          id={rangeId}
          className="w-full"
          value={range}
          onChange={(event) => {
            setRange(
              GROCERY_RANGES.find((option) => option === event.target.value) ??
                DEFAULT_GROCERY_RANGE,
            );
            setResult(null);
          }}
        >
          {GROCERY_RANGES.map((option) => (
            <NativeSelectOption key={option} value={option}>
              {RANGE_LABELS[option]}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
      {count > 0 ? (
        <Button
          variant="secondary"
          size="lg"
          disabled={isPending}
          onClick={add}
        >
          <ShoppingCart data-icon="inline-start" />
          {isPending
            ? "Adding…"
            : `Add ${count} ${count === 1 ? "meal" : "meals"} to the grocery list`}
        </Button>
      ) : (
        !result && (
          <p className="text-muted-foreground flex items-center gap-2 text-sm">
            <ShoppingCart className="size-4" aria-hidden />
            Nothing new to add {rangeText(range)}.
          </p>
        )
      )}
      {result && !result.ok && (
        <p role="alert" className="text-destructive text-sm">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <p
          ref={resultRef}
          role="status"
          tabIndex={-1}
          className="text-muted-foreground text-sm outline-none"
        >
          {describePlanResult(result.result)}
        </p>
      )}
      {(result?.ok || count === 0) && (
        <Button
          variant="outline"
          size="lg"
          nativeButton={false}
          render={<Link href={`/groceries?plan=${planId}`} />}
        >
          Open list
        </Button>
      )}
    </div>
  );
}
