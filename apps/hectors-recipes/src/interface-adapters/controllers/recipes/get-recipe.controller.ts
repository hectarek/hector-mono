import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetRecipeUseCase,
  RecipeDetail,
} from "@/src/application/use-cases/recipes/get-recipe.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  recipeId: z.uuid(),
});

export type IGetRecipeController = ReturnType<typeof getRecipeController>;

export const getRecipeController = (
  getRecipeUseCase: IGetRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getRecipe",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<RecipeDetail> => {
    logger.debug("Fetching recipe", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to view recipes");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid recipe id", { cause: parseError });
    }

    return getRecipeUseCase(data.recipeId, userId);
  };
};
