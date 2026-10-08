import type { IRecipeReadsRepository } from "@/src/application/repositories/recipe-reads.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRecipeReaderService } from "@/src/application/services/recipe-reader.service.interface";
import {
  RecipeReadError,
  type RecipeReadFailure,
} from "@/src/entities/errors/common";
import {
  type CheckedDraft,
  checkDraft,
  holdToSource,
} from "@/src/entities/itemizing-check";
import {
  DAILY_RECIPE_READS,
  type RecipeSource,
  readWindowStart,
} from "@/src/entities/models/recipe-draft.model";

export type IReadRecipeUseCase = ReturnType<typeof readRecipeUseCase>;

// Reads refused before the model saw anything, which cost nothing: the month's budget is spent,
// or a PDF is too long, locked or doesn't open (D53).
const FREE_FAILURES: ReadonlySet<RecipeReadFailure> = new Set([
  "budget-paused",
  "too-many-pages",
  "locked-document",
  "unreadable-document",
]);

// Reads a recipe from a photo, a PDF or a page's text for someone to check before saving;
// nothing is saved here (ux-plan D29). The reader's draft is held to its own words, and a read
// of text to that text too (D30). A photo or PDF has no text to hold it to. Each person gets
// DAILY_RECIPE_READS reads in 24 hours (D48); a read counts as it starts, since a failed one
// costs the same, except one refused before the model saw anything (FREE_FAILURES).
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
      since: readWindowStart(),
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
      if (err instanceof RecipeReadError && FREE_FAILURES.has(err.reason)) {
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
