import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ITagsRepository } from "@/src/application/repositories/tags.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type {
  RecipeWithIngredients,
  UpdateRecipeInput,
} from "@/src/entities/models/recipe.model";
import { toLineWrites } from "@/src/entities/models/recipe-ingredient.model";
import { toStepWrite } from "@/src/entities/models/recipe-step.model";
import { groupsFor, type TagGroups } from "@/src/entities/models/tag.model";

export type IUpdateRecipeUseCase = ReturnType<typeof updateRecipeUseCase>;

export const updateRecipeUseCase = (
  recipesRepository: IRecipesRepository,
  tagsRepository: ITagsRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "updateRecipe",
  });

  return async (
    recipeId: string,
    input: UpdateRecipeInput,
    userId: string,
    // New tags' groups, made in the form (D55).
    tagGroups: TagGroups = {},
  ): Promise<RecipeWithIngredients> => {
    if (Object.keys(input).length === 0) {
      throw new InputParseError("No recipe fields provided to update");
    }

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

      logger.info("Updating recipe", { recipeId, userId });
      await tagsRepository.addGroups(
        groupsFor(input.tags ?? existing.tags, tagGroups),
        tx,
      );
      const { ingredients, steps, ...fields } = input;
      // A line keeps its catalog link while its name is unchanged, so an edit doesn't undo
      // a careful one (the re-read linked "fresh parsley" to parsley).
      const links = new Map(
        existing.ingredients.flatMap((line) =>
          line.name && line.ingredientId
            ? [[line.name, line.ingredientId] as const]
            : [],
        ),
      );
      return recipesRepository.update(
        recipeId,
        {
          ...fields,
          ingredients: ingredients
            ? toLineWrites(ingredients, links)
            : undefined,
          steps: steps?.map(toStepWrite),
        },
        tx,
      );
    });
  };
};
