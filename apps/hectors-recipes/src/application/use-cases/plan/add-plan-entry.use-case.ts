import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  AddPlanEntryInput,
  PlanEntry,
} from "@/src/entities/models/plan-entry.model";

export type IAddPlanEntryUseCase = ReturnType<typeof addPlanEntryUseCase>;

export const addPlanEntryUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addPlanEntry" });

  return async (
    input: AddPlanEntryInput,
    userId: string,
  ): Promise<PlanEntry> => {
    await requireSpaceRole(spacesRepository, {
      spaceId: input.spaceId,
      userId,
      type: "meal-plan",
      minRole: "editor",
    });

    // Everything on a plan comes from a recipe (D40). Any signed-in user can read a recipe
    // by id, so it can come from any book.
    const recipe = await recipesRepository.getById(input.recipeId);
    if (!recipe) {
      throw new NotFoundError("That recipe no longer exists");
    }

    const entry = await planEntriesRepository.create(
      {
        spaceId: input.spaceId,
        cookDate: input.cookDate,
        eatDates: input.eatDates,
        title: recipe.title,
        recipeId: recipe.id,
      },
      userId,
    );
    logger.info("Meal planned", {
      spaceId: input.spaceId,
      cookDate: input.cookDate,
      eatDays: input.eatDates.length,
    });
    return entry;
  };
};
