import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";

export type IRemoveContactUseCase = ReturnType<typeof removeContactUseCase>;

// Takes a person off a job's contacts (R1), from the job's page, which only Hector may do, as with
// any removal (R21). The job's history records it. Their interactions stay as they were.
export const removeContactUseCase = (
  peopleRepository: IPeopleRepository,
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "removeContact",
  });

  return async (
    context: ChangeContext,
    { personId, jobId }: { personId: string; jobId: string },
  ): Promise<{ personId: string; jobId: string }> => {
    const { ownerId } = context;
    const record: RecordRef = { kind: "job", id: jobId };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "remove-contact",
    });
    await transactionManager.startTransaction(async (tx) => {
      const job = await jobsRepository.getForUpdate(ownerId, jobId, tx);
      const person = await peopleRepository.get(ownerId, personId, tx);
      if (!job || !person) {
        throw new NotFoundError("Couldn't find that contact.");
      }
      await peopleRepository.unlinkJob(ownerId, personId, jobId, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "updated",
        before: { contact: person.name },
        after: { contact: null },
      });
    });
    logger.info("Contact removed", { personId, jobId });
    return { personId, jobId };
  };
};
