"use client";

import { Button } from "@repo/ui/components/button";
import { Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { useClosesOnLeave } from "@/app/_lib/use-closes-on-leave";
import { clearGroceryList } from "@/app/actions/grocery";

// Clear list, in Groceries' ⋯ sheet (docs/ux-plan.md D52). It asks first in the sheet itself,
// as Invite turns the sheet into its links, rather than opening a dialog over the sheet.
export function ClearListButton({
  spaceId,
  count,
}: {
  spaceId: string;
  // How many items the list has, checked or not.
  count: number;
}) {
  const [asking, setAsking] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string>();
  const [isPending, startTransition] = useTransition();
  // Asking again when you come back to Groceries, not still mid-question.
  useClosesOnLeave(() => {
    setAsking(false);
    setError(undefined);
  });

  function clear() {
    startTransition(async () => {
      const failed = await callAction(() => clearGroceryList(spaceId));
      setError(failed);
      if (!failed) {
        setAsking(false);
        setCleared(true);
      }
    });
  }

  if (count === 0) {
    return cleared ? (
      <p role="status" className="text-muted-foreground text-center text-sm">
        List cleared.
      </p>
    ) : null;
  }

  if (!asking) {
    return (
      <Button variant="destructive" size="lg" onClick={() => setAsking(true)}>
        <Trash2 data-icon="inline-start" />
        Clear groceries
      </Button>
    );
  }

  return (
    // The border is on a wrapper: a legend is drawn into its own fieldset's border.
    <div className="rounded-xl border p-3">
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 font-medium">Clear all groceries?</legend>
        <p className="text-muted-foreground text-sm">
          This removes {count === 1 ? "the 1 item" : `all ${count} items`},
          checked or not, for everyone in the plan. Planned meals can be added
          again from Meal plan.
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
            {isPending ? "Clearing…" : "Clear groceries"}
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
