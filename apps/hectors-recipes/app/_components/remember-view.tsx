"use client";

import { useEffect } from "react";
import { recordView } from "@/app/actions/recipes";

// Notes that this person opened the recipe, for the library's Recently viewed (D106). From
// the page once it shows, never its render, so a prefetch doesn't count. A tap away doesn't
// wait for it: Next.js lets a navigation go ahead of a pending server action.
export function RememberView({ recipeId }: { recipeId: string }) {
  useEffect(() => {
    recordView(recipeId).catch(() => {
      // No signal: this open just doesn't count.
    });
  }, [recipeId]);
  return null;
}
