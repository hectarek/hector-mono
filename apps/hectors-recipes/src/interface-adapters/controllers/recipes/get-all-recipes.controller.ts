import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetAllRecipesUseCase } from "@/src/application/use-cases/recipes/get-all-recipes.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { LibraryView } from "@/src/entities/library";

const inputSchema = z.object({
  search: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(50).optional(),
});

export type IGetAllRecipesController = ReturnType<
  typeof getAllRecipesController
>;

export const getAllRecipesController = (
  getAllRecipesUseCase: IGetAllRecipesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getAllRecipes",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<LibraryView> => {
    logger.debug("Fetching all recipes", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to view recipes");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return getAllRecipesUseCase(userId, {
      search: data.search,
      tag: data.tag,
    });
  };
};
