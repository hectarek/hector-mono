import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRecipePageFetcherService } from "@/src/application/services/recipe-page-fetcher.service.interface";
import type { IReadRecipeUseCase } from "@/src/application/use-cases/recipes/read-recipe.use-case";
import { RecipeReadError } from "@/src/entities/errors/common";
import type { CheckedDraft } from "@/src/entities/itemizing-check";
import { offeredOnly } from "@/src/entities/models/tag.model";
import { pageText, recipeFromPage } from "@/src/entities/recipe-page";

export type LinkRecipe = {
  draft: CheckedDraft;
  // The page's address after redirects, and its photo when its recipe data names one.
  sourceUrl: string;
  imageUrl: string | null;
  readBy: "page-data" | "reader";
};

export type IReadRecipeFromLinkUseCase = ReturnType<
  typeof readRecipeFromLinkUseCase
>;

// Add by link (ux-plan P10.3): the page's own recipe data when it has some, read without AI;
// otherwise its text, read by the recipe reader (and held to its words, D30). Nothing is saved.
// Either way its tags are suggested only from `tags`, the ones the form offers (D97).
export const readRecipeFromLinkUseCase = (
  recipePageFetcherService: IRecipePageFetcherService,
  readRecipeUseCase: IReadRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "readRecipeFromLink",
  });

  return async (
    url: string,
    userId: string,
    tags: string[] = [],
  ): Promise<LinkRecipe> => {
    const page = await recipePageFetcherService.fetchPage(url);
    const fromData = recipeFromPage(page.html, page.url);
    if (fromData) {
      const draft = {
        ...fromData.draft,
        tags: offeredOnly(fromData.draft.tags, tags),
      };
      logger.info("Read a page's recipe data", {
        lines: draft.ingredients.length,
        steps: draft.steps.length,
        tags: draft.tags.length,
      });
      return { ...fromData, draft, sourceUrl: page.url, readBy: "page-data" };
    }
    const text = pageText(page.html);
    if (!text) {
      throw new RecipeReadError("no-recipe-found", "The page has no text");
    }
    const draft = await readRecipeUseCase({ kind: "text", text }, userId, tags);
    return { draft, sourceUrl: page.url, imageUrl: null, readBy: "reader" };
  };
};
