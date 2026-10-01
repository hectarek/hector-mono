import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireEntryEditor } from "@/src/application/use-cases/plan/require-entry-editor";

export type IRemovePlanEntryUseCase = ReturnType<typeof removePlanEntryUseCase>;

export const removePlanEntryUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removePlanEntry",
  });

  return async (entryId: string, userId: string): Promise<string> => {
    const entry = await requireEntryEditor(
      planEntriesRepository,
      spacesRepository,
      entryId,
      userId,
    );
    await planEntriesRepository.delete(entryId);
    logger.info("Meal removed from plan", { entryId });
    return entry.spaceId;
  };
};
