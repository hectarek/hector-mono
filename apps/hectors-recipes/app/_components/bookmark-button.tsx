"use client";

import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { Bookmark } from "lucide-react";
import { useState, useTransition } from "react";
import { callAction } from "@/app/_lib/call-action";
import { setBookmark } from "@/app/actions/recipes";

// The bookmark to the right of a recipe's name (docs/ux-plan.md D72, D77): filled when saved.
// It changes at once and goes back, with a message, if the save didn't go through.
export function BookmarkButton({
  recipeId,
  saved: initiallySaved,
}: {
  recipeId: string;
  saved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !saved;
    setSaved(next);
    setError(undefined);
    startTransition(async () => {
      const failed = await callAction(() => setBookmark(recipeId, next));
      if (failed) {
        setSaved(!next);
        setError(failed);
      }
    });
  }

  return (
    <div className="flex shrink-0 flex-col items-end">
      <Button
        variant="quiet"
        size="icon-lg"
        aria-label="Save recipe"
        aria-pressed={saved}
        onClick={toggle}
      >
        <Bookmark className={cn(saved && "fill-current")} />
      </Button>
      {error && (
        <p
          role="alert"
          className="text-destructive max-w-40 text-right text-sm"
        >
          {error}
        </p>
      )}
    </div>
  );
}
