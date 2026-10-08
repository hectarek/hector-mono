"use client";

import { Button } from "@repo/ui/components/button";
import { useActionState, useState } from "react";
import { BookSelect } from "@/app/_components/book-select";
import { adoptRecipes } from "@/app/actions/spaces";

export function BulkCopyForm({
  recipes,
  targets,
}: {
  recipes: { id: string; title: string }[];
  targets: { id: string; name: string }[];
}) {
  const [state, formAction, isPending] = useActionState(adoptRecipes, null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selected.size === recipes.length;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">
          {selected.size} of {recipes.length} selected
        </span>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() =>
            setSelected(
              allSelected ? new Set() : new Set(recipes.map((r) => r.id)),
            )
          }
        >
          {allSelected ? "Select none" : "Select all"}
        </Button>
      </div>

      <ul className="flex flex-col divide-y rounded-xl border">
        {recipes.map((recipe) => (
          <li key={recipe.id}>
            <label className="flex cursor-pointer items-center gap-3 p-3">
              <input
                type="checkbox"
                name="recipeId"
                value={recipe.id}
                checked={selected.has(recipe.id)}
                onChange={() => toggle(recipe.id)}
                className="size-4 shrink-0 accent-current"
              />
              <span className="truncate text-sm">{recipe.title}</span>
            </label>
          </li>
        ))}
      </ul>

      <div className="bg-background bottom-safe-18 sticky flex flex-col gap-2 border-t pt-3">
        <BookSelect targets={targets} />
        {state?.error && (
          <p className="text-destructive text-sm">{state.error}</p>
        )}
        <Button
          type="submit"
          size="lg"
          disabled={isPending || selected.size === 0}
        >
          {isPending
            ? "Copying…"
            : `Copy ${selected.size || ""} recipe${selected.size === 1 ? "" : "s"}`}
        </Button>
      </div>
    </form>
  );
}
