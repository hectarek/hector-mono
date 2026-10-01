import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetRecipesUseCase } from "@/src/application/use-cases/recipes/get-recipes.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { LibraryView } from "@/src/entities/library";

const inputSchema = z.object({
  spaceId: z.uuid(),
  search: z.string().trim().max(100).optional(),
  tag: z.string().trim().max(50).optional(),
});

export type IGetRecipesController = ReturnType<typeof getRecipesController>;

export const getRecipesController = (
  getRecipesUseCase: IGetRecipesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getRecipes",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<LibraryView> => {
    logger.debug("Fetching recipes", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to view recipes");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return getRecipesUseCase(data.spaceId, userId, {
      search: data.search,
      tag: data.tag,
    });
  };
};
