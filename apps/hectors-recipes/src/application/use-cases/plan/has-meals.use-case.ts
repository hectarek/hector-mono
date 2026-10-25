import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireSpaceRole } from "@/src/application/use-cases/spaces/require-space-role";

export type IHasMealsUseCase = ReturnType<typeof hasMealsUseCase>;

// Whether the plan has a meal on any day, so Meal plan offers Clear meal plan only then (D91).
export const hasMealsUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "hasMeals" });

  return async (planId: string, userId: string): Promise<boolean> => {
    await requireSpaceRole(spacesRepository, {
      spaceId: planId,
      userId,
      type: "meal-plan",
      minRole: "viewer",
    });
    const has = await planEntriesRepository.hasEntries(planId);
    logger.debug("Checked for meals", { planId, has });
    return has;
  };
};
