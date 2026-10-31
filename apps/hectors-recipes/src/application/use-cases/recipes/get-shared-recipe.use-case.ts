import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { SharedRecipe } from "@/src/entities/models/recipe.model";

export type IGetSharedRecipeUseCase = ReturnType<typeof getSharedRecipeUseCase>;

// The recipe a view-only public link opens (docs/ux-plan.md D98, D99), for anyone, signed in or
// not: the link is the access. Only what the page shows comes back. A link that's off, or
// never was, is not found.
export const getSharedRecipeUseCase = (
  recipesRepository: IRecipesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getSharedRecipe",
  });

  return async (token: string): Promise<SharedRecipe> => {
    const recipeId = await recipesRepository.getIdByShareToken(token);
    const recipe = recipeId && (await recipesRepository.getById(recipeId));
    if (!recipe) {
      throw new NotFoundError("Shared recipe not found");
    }

    logger.debug("Shared recipe fetched", { recipeId });
    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      timeMinutes: recipe.timeMinutes,
      yieldServings: recipe.yieldServings,
      sourceUrl: recipe.sourceUrl,
      imageUrl: recipe.imageUrl,
      videoUrl: recipe.videoUrl,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
    };
  };
};
