"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@repo/ui/components/drawer";
import {
  CalendarDays,
  CalendarMinus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { describePlanResult } from "@/app/_components/add-plan-to-list-button";
import { MealDaysPicker } from "@/app/_components/meal-days-picker";
import { callAction, callResultAction } from "@/app/_lib/call-action";
import { useClosesWhenHidden } from "@/app/_lib/use-closes-when-hidden";
import { addPlanToList } from "@/app/actions/grocery";
import { changeEntryDays } from "@/app/actions/plan";
import {
  canTakeDayOff,
  type MealDays,
  mealDaysText,
  toggleEatDay,
} from "@/src/entities/meal-days";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { shortDay } from "@/src/entities/week";

// A planned meal's actions, as a bottom sheet like the grocery list's: Change days (the same
// picker as Add to meal plan: cook day and eat days, D38), its ingredients onto the list (again,
// once they're there: a second batch, D41), on a leftovers day taking that day off it (D43),
// and Remove meal.
export function PlanEntrySheet({
  entry,
  date,
  today,
  open,
  onOpenChange,
  onRemove,
}: {
  entry: PlanEntry;
  // The day of the row it opened from.
  date: string;
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: () => void;
}) {
  const planned = { cookDate: entry.cookDate, eatDates: entry.eatDates };
  const [changing, setChanging] = useState(false);
  const [days, setDays] = useState<MealDays>(planned);
  const [error, setError] = useState<string>();
  const [listed, setListed] = useState<string>();
  const [isPending, startTransition] = useTransition();

  function changeOpen(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setChanging(false);
      setDays(planned);
      setError(undefined);
      setListed(undefined);
    }
  }
  useClosesWhenHidden(() => {
    if (open) changeOpen(false);
  });

  function addToList() {
    startTransition(async () => {
      // Which button was pressed: a sheet from before someone else's press still says
      // "Add to grocery list", and the server then adds nothing.
      const state = await callResultAction(() =>
        addPlanToList({
          planId: entry.spaceId,
          entryId: entry.id,
          again: Boolean(entry.addedToListAt),
        }),
      );
      if (state && !state.ok) {
        setError(state.error);
        return;
      }
      setError(undefined);
      setListed(state?.ok ? describePlanResult(state.result) : undefined);
    });
  }

  function notEatingThatDay() {
    startTransition(async () => {
      const failed = await callAction(() =>
        changeEntryDays(entry.id, toggleEatDay(planned, date)),
      );
      if (failed) {
        setError(failed);
        return;
      }
      changeOpen(false);
    });
  }

  function save() {
    if (
      days.cookDate === entry.cookDate &&
      days.eatDates.join() === entry.eatDates.join()
    ) {
      changeOpen(false);
      return;
    }
    startTransition(async () => {
      const failed = await callAction(() => changeEntryDays(entry.id, days));
      if (failed) {
        setError(failed);
        return;
      }
      changeOpen(false);
    });
  }

  return (
    <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>{entry.title}</DrawerTitle>
          <DrawerDescription>{mealDaysText(planned, today)}</DrawerDescription>
        </DrawerHeader>

        <div className="pb-safe-4 flex flex-col gap-3 overflow-y-auto px-4 pt-4">
          {changing ? (
            <>
              <MealDaysPicker today={today} value={days} onChange={setDays} />
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button
                size="lg"
                disabled={isPending || days.eatDates.length === 0}
                onClick={save}
              >
                {isPending ? "Saving…" : "Save days"}
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  setChanging(false);
                  setDays(planned);
                  setError(undefined);
                }}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => {
                  // From the meal's saved days: the sheet stays mounted across a save.
                  setDays(planned);
                  setChanging(true);
                }}
              >
                <CalendarDays data-icon="inline-start" />
                Change days
              </Button>
              {entry.recipeId && (
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={isPending}
                  onClick={addToList}
                >
                  <ShoppingCart data-icon="inline-start" />
                  {isPending
                    ? "Adding…"
                    : entry.addedToListAt
                      ? "Add to groceries again"
                      : "Add to groceries"}
                </Button>
              )}
              {listed && (
                <p className="text-muted-foreground text-sm">{listed}</p>
              )}
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              {/* Leftovers (D43): one day off, never the last one. */}
              {canTakeDayOff(planned, date) && (
                <Button
                  size="lg"
                  variant="secondary"
                  disabled={isPending}
                  onClick={notEatingThatDay}
                >
                  <CalendarMinus data-icon="inline-start" />
                  {date === today
                    ? "Not eating it today"
                    : `Not eating it on ${shortDay(date, today)}`}
                </Button>
              )}
              <Button
                size="lg"
                variant="destructive"
                onClick={() => {
                  changeOpen(false);
                  onRemove();
                }}
              >
                <Trash2 data-icon="inline-start" />
                Remove meal
              </Button>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
