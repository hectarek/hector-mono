import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { afterMove } from "@/src/entities/job-lifecycle";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { Job, StatusMoveInput } from "@/src/entities/models/job.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IMoveJobUseCase = ReturnType<typeof moveJobUseCase>;

// Moves a job's status (set_job_status and close_job; R2, R3), on a date, today by default and
// never after it. The lifecycle rules set applied-on, the follow-up and a closing's cleared next
// step (job-lifecycle.ts). The move is logged twice in one transaction: its dated row in
// job_status_changes, which counts read (KTD7), and the job's history, with a closing's reason.
// Only an accepted job moves: a proposal waits for Hector's review.
export const moveJobUseCase = (
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "moveJob" });

  return async (
    context: ChangeContext,
    { id, status, on, reason }: StatusMoveInput,
  ): Promise<Job> => {
    const { ownerId } = context;
    const today = todayIn(PLAN_TIME_ZONE);
    const date = on ?? today;
    if (date > today) {
      throw new InputParseError("A move can't be dated after today.");
    }

    const job = await transactionManager.startTransaction(async (tx) => {
      const current = await jobsRepository.getForUpdate(ownerId, id, tx);
      if (!current) {
        throw new NotFoundError("Couldn't find that job.");
      }
      if (current.reviewState !== "accepted") {
        throw new InputParseError(
          "A proposal's status moves once Hector accepts it.",
        );
      }
      const stage = afterMove(current, status, date);
      const moved = await jobsRepository.update(ownerId, id, stage, tx);
      await jobsRepository.addStatusChange(
        ownerId,
        id,
        { from: current.status, to: status, on: date, actor: context.actor },
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "job", id },
        action: "updated",
        before: {
          status: current.status,
          appliedOn: current.appliedOn,
          nextStep: current.nextStep,
          nextDate: current.nextDate,
        },
        after: stage,
        reason,
      });
      return moved;
    });
    logger.info("Job moved", { jobId: id, to: status });
    return job;
  };
};
