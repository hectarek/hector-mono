import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";

export type IDeleteRecipeUseCase = ReturnType<typeof deleteRecipeUseCase>;

export const deleteRecipeUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "deleteRecipe",
  });

  // Returns the book the recipe was in, for going back to it afterwards.
  return async (recipeId: string, userId: string): Promise<string> => {
    return transactionManagerService.startTransaction(async (tx) => {
      const existing = await recipesRepository.getById(recipeId, tx);
      if (!existing) {
        throw new NotFoundError("Recipe not found");
      }

      await requireSpaceRole(
        spacesRepository,
        {
          spaceId: existing.spaceId,
          userId,
          type: "recipe-book",
          minRole: "editor",
        },
        tx,
      );

      logger.info("Deleting recipe", { recipeId, userId });
      await recipesRepository.delete(recipeId, tx);
      return existing.spaceId;
    });
  };
};
