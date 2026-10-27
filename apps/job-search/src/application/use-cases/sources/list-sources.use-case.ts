import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { LeadSource } from "@/src/entities/models/lead-source.model";

export type IListSourcesUseCase = ReturnType<typeof listSourcesUseCase>;

// The owner's lead sources, by name (docs/build-plan.md U5).
export const listSourcesUseCase = (
  leadSourcesRepository: ILeadSourcesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "listSources" });

  return async (ownerId: string): Promise<LeadSource[]> => {
    const sources = await leadSourcesRepository.list(ownerId);
    logger.debug("Sources listed", { count: sources.length });
    return sources;
  };
};
