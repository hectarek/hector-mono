import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { RecipeWithIngredients } from "@/src/entities/models/recipe.model";
import { hasRole } from "@/src/entities/models/space.model";

export type RecipeDetail = {
  recipe: RecipeWithIngredients;
  canEdit: boolean;
};

export type IGetRecipeUseCase = ReturnType<typeof getRecipeUseCase>;

// Any signed-in user can open a recipe by its link; editing still needs a role in its book.
export const getRecipeUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getRecipe",
  });

  return async (recipeId: string, userId: string): Promise<RecipeDetail> => {
    const recipe = await recipesRepository.getById(recipeId);
    if (!recipe) {
      throw new NotFoundError("Recipe not found");
    }

    const access = await spacesRepository.getAccess(recipe.spaceId, userId);
    const canEdit = !!access?.role && hasRole(access.role, "editor");

    logger.debug("Recipe fetched", { recipeId, canEdit });
    return { recipe, canEdit };
  };
};
