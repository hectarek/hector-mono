import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ILeadSourcesRepository } from "@/src/application/repositories/lead-sources.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { sourceNamed } from "@/src/application/use-cases/sources/source-named";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type {
  AddedSource,
  AddSourceInput,
} from "@/src/entities/models/lead-source.model";

export type IAddSourceUseCase = ReturnType<typeof addSourceUseCase>;

// Adds a lead source (add_source, docs/build-plan.md U5), or answers with the one already listed
// under that name in any case, which changes nothing and so logs nothing.
export const addSourceUseCase = (
  leadSourcesRepository: ILeadSourcesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addSource" });

  return async (
    context: ChangeContext,
    { name }: AddSourceInput,
  ): Promise<AddedSource> => {
    const added = await transactionManager.startTransaction((tx) =>
      sourceNamed(leadSourcesRepository, activityRepository, tx, context, name),
    );
    logger.info("Source added", {
      sourceId: added.source.id,
      created: added.created,
    });
    return added;
  };
};
