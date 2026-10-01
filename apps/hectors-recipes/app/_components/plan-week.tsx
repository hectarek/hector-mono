"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Check, CookingPot, Ellipsis, ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { PlanEntrySheet } from "@/app/_components/plan-entry-sheet";
import { callAction } from "@/app/_lib/call-action";
import { removePlanEntry, setEntryCooked } from "@/app/actions/plan";
import { mealsOnDay } from "@/src/entities/meal-days";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { shortDay } from "@/src/entities/week";

export type PlanDay = {
  date: string;
  weekday: string;
  label: string;
  isToday: boolean;
  isPast: boolean;
};

// A meal on one day of the week (docs/ux-plan.md D38, D39). On its cook day: a pot, "Cook",
// and the check that it's cooked, the plan's only check. On a day it's only eaten: lighter,
// with the day it's cooked. Either row opens the meal's sheet (Change days, Remove meal, and
// on a leftovers day, not eating it then).
function MealRow({
  entry,
  date,
  cooks,
  eats,
  past,
  canEdit,
  today,
}: {
  entry: PlanEntry;
  date: string;
  cooks: boolean;
  eats: boolean;
  past: boolean;
  canEdit: boolean;
  today: string;
}) {
  const [cooked, setOptimisticCooked] = useOptimistic(entry.cooked);
  const [removed, setRemoved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  if (removed) {
    return null;
  }

  function toggle() {
    startTransition(async () => {
      setOptimisticCooked(!cooked);
      setError(await callAction(() => setEntryCooked(entry.id, !cooked)));
    });
  }

  function remove() {
    setRemoved(true);
    startTransition(async () => {
      const failed = await callAction(() => removePlanEntry(entry.id));
      if (failed) {
        setRemoved(false);
        setError(failed);
      }
    });
  }

  const days = (dates: string[]) =>
    dates.map((date) => shortDay(date, today)).join(", ");
  const note = cooks
    ? eats
      ? "Cook"
      : `Cook · eat ${days(entry.eatDates)}`
    : `Cooked ${days([entry.cookDate])}`;

  return (
    <li className="flex flex-col py-1.5">
      <div className="flex items-center gap-2">
        {/* The circle stays small, but the button around it is 45px, the size a thumb
            needs; the negative margin keeps the row's layout as it was. An eat-only row
            keeps the same space, so titles line up. */}
        {cooks ? (
          <button
            type="button"
            onClick={toggle}
            disabled={!canEdit}
            aria-pressed={cooked}
            aria-label={
              cooked
                ? `Mark ${entry.title} not cooked`
                : `Mark ${entry.title} cooked`
            }
            className="-m-1.5 flex size-9 shrink-0 items-center justify-center rounded-full"
          >
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border transition-colors",
                cooked
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input",
                !canEdit && "opacity-60",
              )}
            >
              {cooked && <Check className="size-3.5" aria-hidden />}
            </span>
          </button>
        ) : (
          <span aria-hidden className="-m-1.5 size-9 shrink-0" />
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          {entry.recipeId ? (
            <Link
              href={`/recipes/${entry.recipeId}`}
              className={cn(
                "font-heading truncate underline-offset-2 hover:underline",
                (!cooks || cooked || past) && "text-muted-foreground",
              )}
            >
              {entry.title}
            </Link>
          ) : (
            <span
              className={cn(
                "font-heading truncate",
                (!cooks || cooked || past) && "text-muted-foreground",
              )}
            >
              {entry.title}
            </span>
          )}
          <span className="text-muted-foreground flex items-center gap-1 text-xs">
            {cooks && <CookingPot className="size-3.5" aria-hidden />}
            {note}
            {/* Its ingredients are on the list (D41). */}
            {cooks && entry.addedToListAt && (
              <>
                <ShoppingCart className="ml-1 size-3.5" aria-hidden />
                <span className="sr-only">, on the grocery list</span>
              </>
            )}
          </span>
        </div>

        {canEdit && (
          <>
            <Button
              variant="quiet"
              size="icon-lg"
              onClick={() => setSheetOpen(true)}
              disabled={isPending}
              aria-label={`Change or remove ${entry.title}`}
            >
              <Ellipsis />
            </Button>
            <PlanEntrySheet
              entry={entry}
              date={date}
              today={today}
              open={sheetOpen}
              onOpenChange={setSheetOpen}
              onRemove={remove}
            />
          </>
        )}
      </div>
      {error && (
        <p role="alert" className="text-destructive pl-8 text-xs">
          {error}
        </p>
      )}
    </li>
  );
}

// The week, a day at a time: the meals eaten each day and the ones cooked then (D38).
// Days before today are muted, so the week reads as a schedule; their controls stay full
// strength, since they still work.
export function PlanWeek({
  today,
  days,
  entries,
  canEdit,
}: {
  // "YYYY-MM-DD" in the plan's time zone.
  today: string;
  days: PlanDay[];
  entries: PlanEntry[];
  canEdit: boolean;
}) {
  return (
    <ol className="flex flex-col divide-y rounded-xl border">
      {days.map((day) => {
        const meals = mealsOnDay(entries, day.date);
        return (
          <li
            key={day.date}
            className="flex min-h-12 flex-col justify-center px-3 py-2"
          >
            <h2
              className={cn(
                "flex items-center gap-2 text-sm",
                day.isPast && "text-muted-foreground",
              )}
            >
              {day.isToday && (
                <span className="bg-chart-3 text-chart-foreground -rotate-3 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase">
                  Today
                </span>
              )}
              <span className="font-semibold">{day.weekday}</span>
              <span className="text-muted-foreground">{day.label}</span>
            </h2>
            {meals.length > 0 && (
              <ul className="flex flex-col">
                {meals.map(({ meal, cooks, eats }) => (
                  <MealRow
                    key={meal.id}
                    entry={meal}
                    date={day.date}
                    cooks={cooks}
                    eats={eats}
                    past={day.isPast}
                    canEdit={canEdit}
                    today={today}
                  />
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}
