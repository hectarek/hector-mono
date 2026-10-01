import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";

export type IListMealsToAddUseCase = ReturnType<typeof listMealsToAddUseCase>;

// The cook days of the meals the grocery button could add, from today on (D41, D44): the
// Plan tab counts them for each range.
export const listMealsToAddUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "listMealsToAdd",
  });

  return async (
    planId: string,
    userId: string,
    today: string,
  ): Promise<string[]> => {
    await requireSpaceRole(spacesRepository, {
      spaceId: planId,
      userId,
      type: "meal-plan",
      minRole: "viewer",
    });
    const cookDays = (
      await planEntriesRepository.listNotAdded(planId, {
        from: today,
        to: null,
      })
    ).map((entry) => entry.cookDate);
    logger.debug("Meals to add listed", { planId, count: cookDays.length });
    return cookDays;
  };
};
