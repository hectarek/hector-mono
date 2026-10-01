import { notFound } from "next/navigation";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { getInjection } from "@/di/container";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";

// Shared by the recipe pages: unknown or malformed ids become a 404, anything else is logged and rethrown.
export async function loadRecipe(recipeId: string) {
  const logger = getInjection("ILoggerService").child({
    layer: "page",
    op: "loadRecipe",
  });

  try {
    const userId = await getCurrentUserId();
    return await getInjection("IGetRecipeController")({ recipeId }, userId);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof InputParseError) {
      notFound();
    }
    logger.error("Failed to load recipe", {
      recipeId,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}
