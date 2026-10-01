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
import { Input } from "@repo/ui/components/input";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { useRecipeServings } from "@/app/_components/recipe-servings";
import { SpacePicker } from "@/app/_components/space-picker";
import { type AddToListState, addRecipeToList } from "@/app/actions/grocery";
import type { AddToListResult } from "@/src/entities/models/grocery-item.model";

// Whether an add changed the list at all (it may have left everything out as already there).
export function changedList(result: AddToListResult): boolean {
  return result.added + result.merged + result.skipped > 0;
}

export function describeAddResult(result: AddToListResult): string {
  const parts = [
    result.added && `${result.added} added`,
    result.merged && `${result.merged} combined with items already on the list`,
    result.skipped && `${result.skipped} already there`,
  ].filter(Boolean);
  return parts.length ? `${parts.join(", ")}.` : "Nothing new to add.";
}

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
  // The page's servings (RecipeServings), taken each time the dialog opens; kept as typed
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
        await addRecipeToList({
          recipeId,
          planId,
          servings: yieldServings
            ? Math.min(100, Math.max(1, Number.parseInt(servings, 10) || 1))
            : undefined,
          again,
        }),
      );
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    send(false);
  }

  const done = result?.ok ? result.result : null;

  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) setServings(String(shared.servings));
        else setResult(null);
      }}
    >
      <DialogTrigger render={<Button variant="outline" size="lg" />}>
        <ShoppingCart data-icon="inline-start" />
        Add to list
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add ingredients to your list</DialogTitle>
          <DialogDescription>&ldquo;{title}&rdquo;</DialogDescription>
        </DialogHeader>

        {done && !changedList(done) ? (
          // Its items are still unchecked on the list: adding again sums into them.
          <div className="flex flex-col gap-4">
            <p className="text-sm">
              It&apos;s already on this list. Adding it again doubles its
              amounts.
            </p>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" size="lg" type="button" />}
              >
                Cancel
              </DialogClose>
              <Button size="lg" disabled={isPending} onClick={() => send(true)}>
                {isPending ? "Adding…" : "Add again"}
              </Button>
            </DialogFooter>
          </div>
        ) : done ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm">{describeAddResult(done)}</p>
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" size="lg" type="button" />}
              >
                Done
              </DialogClose>
              <Button
                size="lg"
                nativeButton={false}
                render={<Link href={`/groceries?plan=${done.planId}`} />}
              >
                Open list
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-4">
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
              label="List"
              spaces={plans}
              value={planId}
              onChange={setPlanId}
            />
            {result && !result.ok && (
              <p className="text-destructive text-sm">{result.error}</p>
            )}
            <DialogFooter>
              <DialogClose
                render={<Button variant="outline" size="lg" type="button" />}
              >
                Cancel
              </DialogClose>
              <Button type="submit" size="lg" disabled={isPending}>
                {isPending ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
