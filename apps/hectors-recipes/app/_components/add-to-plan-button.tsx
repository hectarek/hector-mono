"use client";

import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/ui/components/dialog";
import { CalendarPlus } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { MealDaysPicker } from "@/app/_components/meal-days-picker";
import { SpacePicker } from "@/app/_components/space-picker";
import { addPlanEntry } from "@/app/actions/plan";
import { type MealDays, mealDaysText } from "@/src/entities/meal-days";

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
      const result = await addPlanEntry({ spaceId: planId, recipeId, ...days });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setError(undefined);
      setAdded(days);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setAdded(undefined);
      }}
    >
      <DialogTrigger render={<Button variant="secondary" size="lg" />}>
        <CalendarPlus data-icon="inline-start" />
        Add to plan
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add to plan</DialogTitle>
          <DialogDescription>&ldquo;{title}&rdquo;</DialogDescription>
        </DialogHeader>

        {added ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">Planned: {mealDaysText(added, today)}.</p>
            <DialogFooter>
              <DialogClose
                render={<Button variant="secondary" size="lg" type="button" />}
              >
                Done
              </DialogClose>
              <Button
                size="lg"
                nativeButton={false}
                render={
                  <Link
                    href={`/plan?week=${added.cookDate}${planId ? `&plan=${planId}` : ""}`}
                  />
                }
              >
                Open plan
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
            <MealDaysPicker today={today} value={days} onChange={setDays} />
            <SpacePicker
              label="Plan"
              spaces={plans}
              value={planId}
              onChange={setPlanId}
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <DialogFooter>
              <DialogClose
                render={<Button variant="secondary" size="lg" type="button" />}
              >
                Cancel
              </DialogClose>
              <Button
                type="submit"
                size="lg"
                disabled={isPending || days.eatDates.length === 0}
              >
                {isPending ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
