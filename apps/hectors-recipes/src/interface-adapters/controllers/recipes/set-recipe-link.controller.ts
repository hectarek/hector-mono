import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetRecipeLinkUseCase } from "@/src/application/use-cases/recipes/set-recipe-link.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  recipeId: z.uuid(),
  shared: z.boolean(),
});

export type ISetRecipeLinkController = ReturnType<
  typeof setRecipeLinkController
>;

export const setRecipeLinkController = (
  setRecipeLinkUseCase: ISetRecipeLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setRecipeLink",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<string | null> => {
    logger.debug("Validating set recipe link input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to share a recipe");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return setRecipeLinkUseCase(data.recipeId, data.shared, userId);
  };
};
