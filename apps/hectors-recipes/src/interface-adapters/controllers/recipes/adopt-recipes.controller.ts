import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAdoptRecipesUseCase } from "@/src/application/use-cases/recipes/adopt-recipes.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  recipeIds: z
    .array(z.uuid())
    .min(1, "Pick at least one recipe")
    .max(200)
    .transform((ids) => [...new Set(ids)]),
  targetSpaceId: z.uuid(),
});

export type IAdoptRecipesController = ReturnType<typeof adoptRecipesController>;

export const adoptRecipesController = (
  adoptRecipesUseCase: IAdoptRecipesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "adoptRecipes",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<number> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return adoptRecipesUseCase(data.recipeIds, data.targetSpaceId, userId);
  };
};
