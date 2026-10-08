"use client";

import { useEffect } from "react";
import { rememberView } from "@/app/_lib/recently-viewed";

// Notes on this device that the recipe was opened, for the library's Recently viewed (D76).
export function RememberView({ recipeId }: { recipeId: string }) {
  useEffect(() => {
    rememberView(recipeId);
  }, [recipeId]);
  return null;
}
