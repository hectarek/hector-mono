import type { IPlanEntriesRepository } from "@/src/application/repositories/plan-entries.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { requireEntryEditor } from "@/src/application/use-cases/plan/require-entry-editor";

export type ISetEntryCookedUseCase = ReturnType<typeof setEntryCookedUseCase>;

// A meal is checked off once, on its cook day (docs/ux-plan.md D39).
export const setEntryCookedUseCase = (
  planEntriesRepository: IPlanEntriesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setEntryCooked",
  });

  return async (
    entryId: string,
    cooked: boolean,
    userId: string,
  ): Promise<string> => {
    const entry = await requireEntryEditor(
      planEntriesRepository,
      spacesRepository,
      entryId,
      userId,
    );
    await planEntriesRepository.setCooked(entryId, cooked);
    logger.debug("Cooked set", { entryId, cooked });
    return entry.spaceId;
  };
};
