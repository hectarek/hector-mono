"use client";

import { Button } from "@repo/ui/components/button";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import { clearMealPlan } from "@/app/actions/plan";

// Clear meal plan, in Meal plan's ⋯ sheet (docs/ux-plan.md D91). It asks first in the sheet
// itself, as Clear groceries does (D52).
export function ClearMealPlanButton({
  planId,
  hasMeals,
}: {
  planId: string;
  // Whether the plan has a meal in any week.
  hasMeals: boolean;
}) {
  const [asking, setAsking] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  // Asking again when you come back to Meal plan, not still mid-question.
  useClosesOnLeave(() => {
    setAsking(false);
    setError(undefined);
  });

  function clear() {
    startTransition(async () => {
      const failed = await callAction(() => clearMealPlan(planId));
      setError(failed);
      if (!failed) {
        setAsking(false);
        setCleared(true);
      }
    });
  }

  if (!hasMeals) {
    return cleared ? (
      <p role="status" className="text-muted-foreground text-center text-sm">
        Meal plan cleared.
      </p>
    ) : null;
  }

  if (!asking) {
    return (
      <Button variant="destructive" size="lg" onClick={() => setAsking(true)}>
        <Trash2 data-icon="inline-start" />
        Clear meal plan
      </Button>
    );
  }

  return (
    // The border is on a wrapper: a legend is drawn into its own fieldset's border.
    <div className="rounded-xl border p-3">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-medium">Clear the meal plan?</legend>
        <p className="text-muted-foreground text-sm">
          This removes every meal, in every week, for everyone in the meal plan.
          Groceries stay as they are.
        </p>
        {error && (
          <p role="alert" className="text-destructive text-sm">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setAsking(false);
              setError(undefined);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="lg"
            disabled={isPending}
            onClick={clear}
          >
            {isPending ? "Clearing…" : "Clear meal plan"}
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
