import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { addDays } from "@/src/entities/week";

export type IGetWeekPlanUseCase = ReturnType<typeof getWeekPlanUseCase>;

export const getWeekPlanUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "getWeekPlan" });

  return async (
    spaceId: string,
    monday: string,
    userId: string,
  ): Promise<PlanEntry[]> => {
    await requireSpaceRole(spacesRepository, {
      spaceId,
      userId,
      type: "meal-plan",
      minRole: "viewer",
    });
    const entries = await planEntriesRepository.listForRange(
      spaceId,
      monday,
      addDays(monday, 6),
    );
    // A meal shows its recipe's name as it is now (a renamed recipe included); the title
    // copied when it was planned is for a recipe since deleted.
    const titles = new Map(
      (
        await recipesRepository.getByIds([
          ...new Set(entries.flatMap((entry) => entry.recipeId ?? [])),
        ])
      ).map((recipe) => [recipe.id, recipe.title]),
    );
    logger.debug("Week loaded", { spaceId, monday, count: entries.length });
    return entries.map((entry) => ({
      ...entry,
      title: (entry.recipeId && titles.get(entry.recipeId)) || entry.title,
    }));
  };
};
