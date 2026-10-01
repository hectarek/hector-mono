import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteRecipeUseCase } from "@/src/application/use-cases/recipes/delete-recipe.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  recipeId: z.uuid(),
});

export type IDeleteRecipeController = ReturnType<typeof deleteRecipeController>;

export const deleteRecipeController = (
  deleteRecipeUseCase: IDeleteRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteRecipe",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<string> => {
    logger.debug("Validating delete recipe input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to delete recipes");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return deleteRecipeUseCase(data.recipeId, userId);
  };
};
