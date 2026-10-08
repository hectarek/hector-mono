"use client";

import { Button } from "@repo/ui/components/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/components/drawer";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { MealDaysPicker } from "@/app/_components/meal-days-picker";
import { SpacePicker } from "@/app/_components/space-picker";
import { callAction } from "@/app/_lib/call-action";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import { addPlanEntry } from "@/app/actions/plan";
import { type MealDays, mealDaysText } from "@/src/entities/meal-days";

// Add to meal plan on the recipe page: a bottom sheet (the design system's pattern for adding to
// the plan) with the cook and eat days and, in two or more plans, which plan.
export function AddToPlanButton({
  recipeId,
  title,
  today,
  plans,
}: {
  recipeId: string;
  title: string;
  today: string;
  plans: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState<MealDays>({
    cookDate: today,
    eatDates: [today],
  });
  const [planId, setPlanId] = useState(plans[0]?.id);
  const [error, setError] = useState<string>();
  const [added, setAdded] = useState<MealDays>();
  const [isPending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const failed = await callAction(() =>
        addPlanEntry({ spaceId: planId, recipeId, ...days }),
      );
      if (failed) {
        setError(failed);
        return;
      }
      setError(undefined);
      setAdded(days);
    });
  }

  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (!next) setAdded(undefined);
  };
  const sheetKey = useClosesOnLeave(() => changeOpen(false));

  return (
    <Drawer
      key={sheetKey}
      open={open}
      onOpenChange={changeOpen}
      showSwipeHandle
    >
      <DrawerTrigger render={<Button variant="secondary" size="lg" />}>
        <CalendarPlus data-icon="inline-start" />
        Add to meal plan
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add to meal plan</DrawerTitle>
          <DrawerDescription>&ldquo;{title}&rdquo;</DrawerDescription>
        </DrawerHeader>

        <div className="pb-safe-4 flex flex-col gap-3 overflow-y-auto px-4 pt-4">
          {added ? (
            <>
              <p className="text-sm">Planned: {mealDaysText(added, today)}.</p>
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link
                    href={`/plan?week=${added.cookDate}${planId ? `&plan=${planId}` : ""}`}
                    transitionTypes={["switch-tab"]}
                  />
                }
              >
                Open meal plan
              </Button>
              <DrawerClose render={<Button variant="secondary" size="lg" />}>
                Done
              </DrawerClose>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              <MealDaysPicker today={today} value={days} onChange={setDays} />
              <SpacePicker
                label="Meal plan"
                spaces={plans}
                value={planId}
                onChange={setPlanId}
              />
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                disabled={isPending || days.eatDates.length === 0}
              >
                {isPending ? "Adding…" : "Add"}
              </Button>
              <DrawerClose
                render={<Button variant="secondary" size="lg" type="button" />}
              >
                Cancel
              </DrawerClose>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
