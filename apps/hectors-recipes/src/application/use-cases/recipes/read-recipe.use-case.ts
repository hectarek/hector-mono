import type { IRecipeReadsRepository } from "@/src/application/repositories/recipe-reads.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRecipeReaderService } from "@/src/application/services/recipe-reader.service.interface";
import { RecipeReadError } from "@/src/entities/errors/common";
import {
  type CheckedDraft,
  checkDraft,
  holdToSource,
} from "@/src/entities/itemizing-check";
import {
  DAILY_RECIPE_READS,
  type RecipeSource,
} from "@/src/entities/models/recipe-draft.model";

export type IReadRecipeUseCase = ReturnType<typeof readRecipeUseCase>;

// Reads a recipe from a photo or a page's text for someone to check before saving; nothing is
// saved here (ux-plan D29). The reader's draft is held to its own words, and a read of text
// to that text too (D30). A photo has no text to hold it to. Each person gets
// DAILY_RECIPE_READS reads in 24 hours (D48); a read counts as it starts, since a failed one
// costs the same, except one refused because the month's budget is spent, which cost nothing.
export const readRecipeUseCase = (
  recipeReaderService: IRecipeReaderService,
  recipeReadsRepository: IRecipeReadsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "readRecipe",
  });

  return async (
    source: RecipeSource,
    userId: string,
  ): Promise<CheckedDraft> => {
    const readId = await recipeReadsRepository.record(userId, source.kind, {
      since: new Date(Date.now() - 24 * 60 * 60 * 1000),
      limit: DAILY_RECIPE_READS,
    });
    if (!readId) {
      logger.warn("Daily read limit reached", { userId });
      throw new RecipeReadError("daily-limit", "Daily read limit reached");
    }
    let read: Awaited<ReturnType<IRecipeReaderService["read"]>>;
    try {
      read = await recipeReaderService.read(source);
    } catch (err) {
      if (err instanceof RecipeReadError && err.reason === "budget-paused") {
        await recipeReadsRepository.remove(readId);
      }
      throw err;
    }
    const checked = checkDraft(read);
    const draft =
      source.kind === "text" ? holdToSource(checked, source.text) : checked;
    logger.info("Read a recipe", {
      source: source.kind,
      lines: draft.ingredients.length,
      steps: draft.steps.length,
      flagged: draft.flagged.length,
      unsure: draft.unsure.length,
    });
    return draft;
  };
};
