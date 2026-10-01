import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateRecipeUseCase } from "@/src/application/use-cases/recipes/create-recipe.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  createRecipeSchema,
  type RecipeWithIngredients,
} from "@/src/entities/models/recipe.model";

const inputSchema = z.object({
  spaceId: z.uuid(),
  data: createRecipeSchema,
});

export type ICreateRecipeController = ReturnType<typeof createRecipeController>;

export const createRecipeController = (
  createRecipeUseCase: ICreateRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "createRecipe",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<RecipeWithIngredients> => {
    logger.debug("Validating create recipe input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to create recipes");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      logger.warn("Create recipe input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid recipe data", { cause: parseError });
    }

    return createRecipeUseCase(data.data, data.spaceId, userId);
  };
};
