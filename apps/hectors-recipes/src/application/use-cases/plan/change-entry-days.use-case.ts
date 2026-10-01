import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireEntryEditor } from "@/src/application/use-cases/plan/require-entry-editor";

export type IChangeEntryDaysUseCase = ReturnType<typeof changeEntryDaysUseCase>;

// A meal's cook day and eat days change together (docs/ux-plan.md D38). Everything else
// stays (title, recipe, cooked, added to the list): its ingredients were bought for it,
// whichever days it lands on.
export const changeEntryDaysUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "changeEntryDays",
  });

  return async (
    entryId: string,
    days: { cookDate: string; eatDates: string[] },
    userId: string,
  ): Promise<void> => {
    await requireEntryEditor(
      planEntriesRepository,
      spacesRepository,
      entryId,
      userId,
    );
    await planEntriesRepository.setDays(entryId, days.cookDate, days.eatDates);
    logger.debug("Days changed", { entryId, ...days });
  };
};
