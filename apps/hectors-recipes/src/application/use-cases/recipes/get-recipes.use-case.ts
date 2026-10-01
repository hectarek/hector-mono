import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import {
  buildLibraryView,
  type LibraryFilter,
  type LibraryView,
} from "@/src/entities/library";

export type IGetRecipesUseCase = ReturnType<typeof getRecipesUseCase>;

export const getRecipesUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getRecipes",
  });

  return async (
    spaceId: string,
    userId: string,
    filter: LibraryFilter = {},
  ): Promise<LibraryView> => {
    await requireSpaceRole(spacesRepository, {
      spaceId,
      userId,
      type: "recipe-book",
      minRole: "viewer",
    });

    const recipes = await recipesRepository.getBySpace(spaceId);

    logger.debug("Recipes fetched", { spaceId, count: recipes.length });
    return buildLibraryView(recipes, filter);
  };
};
