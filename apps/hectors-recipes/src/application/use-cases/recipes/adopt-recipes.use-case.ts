import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";

export type IAdoptRecipesUseCase = ReturnType<typeof adoptRecipesUseCase>;

// Copies recipes into a book the user can edit. Reading any recipe only needs a session,
// so the source books don't matter; the copies are independent from then on.
export const adoptRecipesUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "adoptRecipes" });

  return async (
    recipeIds: string[],
    targetSpaceId: string,
    userId: string,
  ): Promise<number> => {
    const copied = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireSpaceRole(
          spacesRepository,
          {
            spaceId: targetSpaceId,
            userId,
            type: "recipe-book",
            minRole: "editor",
          },
          tx,
        );

        const sources = await recipesRepository.getByIds(recipeIds, tx);
        if (sources.length !== new Set(recipeIds).size) {
          throw new NotFoundError("One of the recipes no longer exists");
        }

        return recipesRepository.createMany(
          sources.map((source) => ({
            title: source.title,
            description: source.description,
            timeMinutes: source.timeMinutes,
            yieldServings: source.yieldServings,
            tags: source.tags,
            sourceUrl: source.sourceUrl,
            imageUrl: source.imageUrl,
            videoUrl: source.videoUrl,
            copiedFromRecipeId: source.id,
            // Copied as stored, not re-split, so a careful (AI) itemizing carries over.
            ingredients: source.ingredients.map((line) => ({
              raw: line.raw,
              section: line.section ?? undefined,
              quantity: line.quantity,
              unit: line.unit,
              name: line.name,
              note: line.note,
              optional: line.optional,
              catalogName: null,
              ingredientId: line.ingredientId,
            })),
            steps: source.steps.map(({ text, timerMinutes, section }) => ({
              text,
              timerMinutes,
              section,
            })),
          })),
          targetSpaceId,
          userId,
          tx,
        );
      },
    );

    logger.info("Recipes adopted", { targetSpaceId, count: copied, userId });
    return copied;
  };
};
