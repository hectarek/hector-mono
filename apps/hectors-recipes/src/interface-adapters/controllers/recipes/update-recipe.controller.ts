import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateRecipeUseCase } from "@/src/application/use-cases/recipes/update-recipe.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  type RecipeWithIngredients,
  updateRecipeSchema,
} from "@/src/entities/models/recipe.model";

const inputSchema = z.object({
  recipeId: z.uuid(),
  data: updateRecipeSchema,
});

export type IUpdateRecipeController = ReturnType<typeof updateRecipeController>;

export const updateRecipeController = (
  updateRecipeUseCase: IUpdateRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateRecipe",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<RecipeWithIngredients> => {
    logger.debug("Validating update recipe input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to edit recipes");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      logger.warn("Update recipe input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid recipe data", { cause: parseError });
    }

    return updateRecipeUseCase(data.recipeId, data.data, userId);
  };
};
