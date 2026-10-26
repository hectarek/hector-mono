import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { NotFoundError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import { jobLogged } from "@/src/entities/models/job.model";

export type IDeleteJobUseCase = ReturnType<typeof deleteJobUseCase>;

// Deletes a job, its status moves and its notes, which only Hector may do (R21): Claude's try is
// refused, and logged, before anything is read. The history keeps the job's facts as they were.
export const deleteJobUseCase = (
  jobsRepository: IJobsRepository,
  notesRepository: INotesRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "deleteJob" });

  return async (
    context: ChangeContext,
    { id }: { id: string },
  ): Promise<{ id: string; role: string }> => {
    const { ownerId } = context;
    const record: RecordRef = { kind: "job", id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: "delete",
    });
    const deleted = await transactionManager.startTransaction(async (tx) => {
      const job = await jobsRepository.getForUpdate(ownerId, id, tx);
      if (!job) {
        throw new NotFoundError("Couldn't find that job.");
      }
      await notesRepository.deleteFor(ownerId, { kind: "job", id }, tx);
      await jobsRepository.delete(ownerId, id, tx);
      await recordChange(activityRepository, tx, context, {
        record,
        action: "deleted",
        before: jobLogged(job),
      });
      return { id, role: job.role };
    });
    logger.info("Job deleted", { jobId: id });
    return deleted;
  };
};
