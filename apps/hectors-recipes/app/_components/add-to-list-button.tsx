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
import { Input } from "@repo/ui/components/input";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useRecipeServings } from "@/app/_components/recipe-servings";
import { SpacePicker } from "@/app/_components/space-picker";
import { callResultAction } from "@/app/_lib/call-action";
import { useClosesWhenHidden } from "@/app/_lib/use-closes-when-hidden";
import { type AddToListState, addRecipeToList } from "@/app/actions/grocery";
import type { AddToListResult } from "@/src/entities/models/grocery-item.model";

// Whether an add changed the list at all (it may have left everything out as already there).
export function changedList(result: AddToListResult): boolean {
  return result.added + result.merged + result.skipped > 0;
}

export function describeAddResult(result: AddToListResult): string {
  const parts = [
    result.added && `${result.added} added`,
    result.merged &&
      `${result.merged} combined with items already in groceries`,
    result.skipped && `${result.skipped} already there`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(", ")}.` : "Nothing new to add.";
}

// Add to groceries on the recipe page and in cook mode: a bottom sheet with the servings and, in
// two or more plans, whose list.
export function AddToListButton({
  recipeId,
  title,
  yieldServings,
  plans,
}: {
  recipeId: string;
  title: string;
  yieldServings: number | null;
  // The plans whose list this can go on (a plan's list is part of the plan).
  plans: { id: string; name: string }[];
}) {
  // The page's servings (RecipeServings), taken each time the sheet opens; kept as typed
  // so the box can be cleared and retyped, and clamped when sent.
  const shared = useRecipeServings();
  const [servings, setServings] = useState(String(shared.servings));
  const [planId, setPlanId] = useState(plans[0]?.id);
  const [result, setResult] = useState<AddToListState>(null);
  const [isPending, startTransition] = useTransition();
  const servingsId = useId();

  function send(again: boolean) {
    startTransition(async () => {
      setResult(
        await callResultAction(() =>
          addRecipeToList({
            recipeId,
            planId,
            servings: yieldServings
              ? Math.min(100, Math.max(1, Number.parseInt(servings, 10) || 1))
              : undefined,
            again,
          }),
        ),
      );
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    send(false);
  }

  const done = result?.ok ? result.result : null;

  const [open, setOpen] = useState(false);
  const changeOpen = (next: boolean) => {
    setOpen(next);
    if (next) setServings(String(shared.servings));
    else setResult(null);
  };
  useClosesWhenHidden(() => changeOpen(false));

  return (
    <Drawer open={open} onOpenChange={changeOpen} showSwipeHandle>
      <DrawerTrigger render={<Button variant="secondary" size="lg" />}>
        <ShoppingCart data-icon="inline-start" />
        Add to groceries
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Add to groceries</DrawerTitle>
          <DrawerDescription>&ldquo;{title}&rdquo;</DrawerDescription>
        </DrawerHeader>

        <div className="pb-safe-4 flex flex-col gap-3 overflow-y-auto px-4 pt-4">
          {done && !changedList(done) ? (
            // Its items are still unchecked on the list: adding again sums into them.
            <>
              <p className="text-sm">
                It&apos;s already in groceries. Adding it again doubles its
                amounts.
              </p>
              <Button size="lg" disabled={isPending} onClick={() => send(true)}>
                {isPending ? "Adding…" : "Add again"}
              </Button>
              <DrawerClose render={<Button variant="secondary" size="lg" />}>
                Cancel
              </DrawerClose>
            </>
          ) : done ? (
            <>
              <p className="text-sm">{describeAddResult(done)}</p>
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href={`/groceries?plan=${done.planId}`} />}
              >
                Open groceries
              </Button>
              <DrawerClose render={<Button variant="secondary" size="lg" />}>
                Done
              </DrawerClose>
            </>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-3">
              {yieldServings !== null && (
                <div className="flex flex-col gap-1.5 text-sm">
                  <label htmlFor={servingsId}>Servings</label>
                  <Input
                    id={servingsId}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={100}
                    value={servings}
                    onChange={(event) => setServings(event.target.value)}
                    className="h-9"
                  />
                </div>
              )}
              <SpacePicker
                label="Groceries"
                spaces={plans}
                value={planId}
                onChange={setPlanId}
              />
              {result && !result.ok && (
                <p role="alert" className="text-destructive text-sm">
                  {result.error}
                </p>
              )}
              <Button type="submit" size="lg" disabled={isPending}>
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
