"use client";

import { Button } from "@repo/ui/components/button";
import { ChefHat } from "lucide-react";
import Link from "next/link";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

type RecipeServingsValue = {
  servings: number;
  // A number, or an update from the current one (quick taps each count).
  setServings: (update: number | ((current: number) => number)) => void;
  // The servings the recipe is written for; null if it doesn't say (then nothing scales).
  yieldServings: number | null;
};

const RecipeServingsContext = createContext<RecipeServingsValue | null>(null);

// One servings number for a recipe screen. The stepper sets it; Add to groceries and the Cook
// link read it, so scaling to 6 on the page means 6 on the list and 6 in cook mode. Cook
// mode also keeps it in the URL (?servings=), so a reload doesn't lose it.
export function RecipeServings({
  yieldServings,
  initial,
  inUrl = false,
  children,
}: {
  yieldServings: number | null;
  initial?: number;
  inUrl?: boolean;
  children: ReactNode;
}) {
  const [servings, setState] = useState(initial ?? yieldServings ?? 1);

  const setServings: RecipeServingsValue["setServings"] = (update) =>
    setState((current) =>
      Math.min(
        100,
        Math.max(1, typeof update === "function" ? update(current) : update),
      ),
    );

  // Mirror it in the URL: ?servings=6, or no parameter at the recipe's own servings (or
  // for a recipe that doesn't say, where nothing scales).
  useEffect(() => {
    if (!inUrl) return;
    const url = new URL(window.location.href);
    const wanted =
      yieldServings === null || servings === yieldServings
        ? null
        : String(servings);
    if (url.searchParams.get("servings") === wanted) return;
    if (wanted) url.searchParams.set("servings", wanted);
    else url.searchParams.delete("servings");
    window.history.replaceState(null, "", url);
  }, [servings, yieldServings, inUrl]);

  return (
    <RecipeServingsContext value={{ servings, setServings, yieldServings }}>
      {children}
    </RecipeServingsContext>
  );
}

export function useRecipeServings(): RecipeServingsValue {
  const value = useContext(RecipeServingsContext);
  if (!value) {
    throw new Error("useRecipeServings must be used inside <RecipeServings>");
  }
  return value;
}

// Opens cook mode at the servings chosen on the page.
export function CookLink({
  recipeId,
  className,
}: {
  recipeId: string;
  // Layout only: where it sits in its row.
  className?: string;
}) {
  const { servings, yieldServings } = useRecipeServings();
  const query =
    yieldServings !== null && servings !== yieldServings
      ? `?servings=${servings}`
      : "";
  return (
    <Button
      size="lg"
      nativeButton={false}
      render={
        <Link
          href={`/recipes/${recipeId}/cook${query}`}
          transitionTypes={["open-cook-mode"]}
        />
      }
      className={className}
    >
      <ChefHat data-icon="inline-start" />
      Cook
    </Button>
  );
}
