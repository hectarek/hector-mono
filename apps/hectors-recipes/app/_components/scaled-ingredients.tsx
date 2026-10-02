"use client";

import { Button } from "@repo/ui/components/button";
import { Minus, Plus } from "lucide-react";
import { LineText } from "@/app/_components/line-text";
import { useRecipeServings } from "@/app/_components/recipe-servings";
import type { RecipeIngredient } from "@/src/entities/models/recipe-ingredient.model";
import { showLine } from "@/src/entities/scaling";

type Line = Pick<
  RecipeIngredient,
  | "position"
  | "raw"
  | "section"
  | "quantity"
  | "unit"
  | "name"
  | "note"
  | "optional"
>;

export function ScaledIngredients({ lines }: { lines: Line[] }) {
  // Shared with Add to list and the Cook link (RecipeServings).
  const { servings, setServings, yieldServings } = useRecipeServings();
  const factor = yieldServings ? servings / yieldServings : 1;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-xl">Ingredients</h2>
        {yieldServings !== null && (
          <fieldset className="flex items-center gap-1" aria-label="Servings">
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="Fewer servings"
              disabled={servings <= 1}
              onClick={() => setServings((value) => value - 1)}
            >
              <Minus />
            </Button>
            <span
              className="min-w-20 text-center text-sm tabular-nums"
              aria-live="polite"
            >
              {servings} serving{servings === 1 ? "" : "s"}
            </span>
            <Button
              variant="secondary"
              size="icon-lg"
              aria-label="More servings"
              onClick={() => setServings((value) => value + 1)}
            >
              <Plus />
            </Button>
          </fieldset>
        )}
      </div>

      <ul className="flex flex-col">
        {lines.map((line, index) => {
          const startsSection =
            line.section && line.section !== lines[index - 1]?.section;
          return (
            <li key={line.position} className="flex flex-col">
              {startsSection && (
                <span className="text-muted-foreground mt-3 mb-1 text-xs font-semibold tracking-wide uppercase">
                  {line.section}
                </span>
              )}
              <span className="border-b py-2 text-lg last:border-b-0">
                <LineText line={showLine(line, factor)} />
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
