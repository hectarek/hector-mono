import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import type {
  CreateRecipeInput,
  RecipeWithIngredients,
} from "@/src/entities/models/recipe.model";
import { toLineWrites } from "@/src/entities/models/recipe-ingredient.model";
import { toStepWrite } from "@/src/entities/models/recipe-step.model";

export type ICreateRecipeUseCase = ReturnType<typeof createRecipeUseCase>;

export const createRecipeUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "createRecipe",
  });

  return async (
    input: CreateRecipeInput,
    spaceId: string,
    userId: string,
  ): Promise<RecipeWithIngredients> => {
    const recipe = await transactionManagerService.startTransaction(
      async (tx) => {
        await requireSpaceRole(
          spacesRepository,
          { spaceId, userId, type: "recipe-book", minRole: "editor" },
          tx,
        );

        logger.info("Creating recipe", { spaceId, userId, title: input.title });
        const { steps, ...fields } = input;
        return recipesRepository.create(
          {
            ...fields,
            ingredients: toLineWrites(fields.ingredients),
            steps: (steps ?? []).map(toStepWrite),
          },
          spaceId,
          userId,
          tx,
        );
      },
    );

    logger.debug("Recipe created", { recipeId: recipe.id, spaceId });
    return recipe;
  };
};
