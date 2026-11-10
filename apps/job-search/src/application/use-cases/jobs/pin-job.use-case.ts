import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { Job, PinJobInput } from "@/src/entities/models/job.model";
import { isToApply } from "@/src/entities/rank";

export type IPinJobUseCase = ReturnType<typeof pinJobUseCase>;

// Pins a job to the top of the ranked list, or unpins it (pin_job; R27): Hector's call, and
// Claude's on his word. Only a job not yet applied to is pinned. A pin the job already has, or an
// unpin it doesn't need, writes and logs nothing.
export const pinJobUseCase = (
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "pinJob" });

  return async (
    context: ChangeContext,
    { id, pinned }: PinJobInput,
  ): Promise<Job> => {
    const { ownerId } = context;
    const job = await transactionManager.startTransaction(async (tx) => {
      const current = await jobsRepository.getForUpdate(ownerId, id, tx);
      if (!current) {
        throw new NotFoundError("Couldn't find that job.");
      }
      if (pinned === (current.pinnedAt !== null)) {
        return current;
      }
      if (pinned && !isToApply(current.status)) {
        throw new InputParseError(
          "Only a job not yet applied to can be pinned.",
        );
      }
      const updated = await jobsRepository.update(
        ownerId,
        id,
        { pinnedAt: pinned ? new Date() : null },
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "job", id },
        action: "updated",
        before: { pinned: !pinned },
        after: { pinned },
      });
      return updated;
    });
    logger.info(pinned ? "Job pinned" : "Job unpinned", { jobId: id });
    return job;
  };
};
