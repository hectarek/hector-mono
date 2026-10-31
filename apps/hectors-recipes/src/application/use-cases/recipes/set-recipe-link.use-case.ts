import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";

export type ISetRecipeLinkUseCase = ReturnType<typeof setRecipeLinkUseCase>;

// Turns a recipe's view-only public link on or off (docs/ux-plan.md D98), for its book's owner
// and editors. On keeps a link that's already on; off ends it, so turning it on again makes a
// new one. Returns the link's token, or null when off.
export const setRecipeLinkUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setRecipeLink",
  });

  return async (
    recipeId: string,
    shared: boolean,
    userId: string,
  ): Promise<string | null> => {
    return transactionManagerService.startTransaction(async (tx) => {
      const recipe = await recipesRepository.getById(recipeId, tx);
      if (!recipe) {
        throw new NotFoundError("Recipe not found");
      }

      await requireSpaceRole(
        spacesRepository,
        {
          spaceId: recipe.spaceId,
          userId,
          type: "recipe-book",
          minRole: "editor",
        },
        tx,
      );

      logger.info("Setting recipe link", { recipeId, shared, userId });
      return recipesRepository.setShared(recipeId, shared, tx);
    });
  };
};
