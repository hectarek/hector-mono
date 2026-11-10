import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import {
  ConflictError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import {
  afterMove,
  isClosed,
  type JobStage,
  type JobStatus,
} from "@/src/entities/job-lifecycle";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { Job, StatusMoveInput } from "@/src/entities/models/job.model";
import { withStepDate } from "@/src/entities/next-step";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IMoveJobUseCase = ReturnType<typeof moveJobUseCase>;

// Moves a job's status (set_job_status and close_job; R2, R3), on a date, today by default and
// never after it. The lifecycle rules set applied-on, the new stage's next step and a closing's
// cleared one (job-lifecycle.ts); a move to an open status can give its own step and date
// instead, the step dated a week out when it has none (the UX plan's UX9). The move is logged twice
// in one transaction: its dated row in job_status_changes, which counts read (KTD7), and the job's
// history, with a closing's reason. Only Hector moves an archived job back to an open status (R21
// as revised 2026-11-10), so a job he passed on stays passed on: anyone else is refused, and
// logged, before the move's transaction opens. A move given the updatedAt it read (the daily
// expiry run's) is made only against it (R22). A move to the status the job holds already writes
// and logs nothing, so a retried move never counts twice.
export const moveJobUseCase = (
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "moveJob" });

  return async (
    context: ChangeContext,
    { id, status, on, reason, nextStep, nextDate, updatedAt }: StatusMoveInput,
  ): Promise<Job> => {
    const { ownerId } = context;
    const today = todayIn(PLAN_TIME_ZONE);
    const date = on ?? today;
    if (date > today) {
      throw new InputParseError("A move can't be dated after today.");
    }
    const read = await jobsRepository.get(ownerId, id);
    if (!read) {
      throw new NotFoundError("Couldn't find that job.");
    }
    if (reopens(read.status, status)) {
      await requireHuman(activityRepository, transactionManager, context, {
        record: { kind: "job", id },
        operation: "reopen",
      });
    }

    const job = await transactionManager.startTransaction(async (tx) => {
      const current = await jobsRepository.getForUpdate(ownerId, id, tx);
      if (!current) {
        throw new NotFoundError("Couldn't find that job.");
      }
      // Archived since the check above, or changed since the caller read it.
      if (
        (context.actor !== "owner" && reopens(current.status, status)) ||
        (updatedAt !== undefined &&
          current.updatedAt.getTime() !== updatedAt.getTime())
      ) {
        throw new ConflictError(current);
      }
      if (current.status === status) {
        return current;
      }
      const stage = withGivenStep(
        afterMove(current, status, date),
        { nextStep, nextDate },
        today,
      );
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

// A move from an archived status back to an open one.
function reopens(from: JobStatus, to: JobStatus): boolean {
  return isClosed(from) && !isClosed(to);
}

// The step and date a move gives, over the ones it sets (the UX plan's UX9): a step given alone
// keeps the new stage's date, no step clears the date, and a step given a null date is due a week
// out (R1 and R7 as revised 2026-11-07).
function withGivenStep(
  set: JobStage,
  given: Pick<StatusMoveInput, "nextStep" | "nextDate">,
  today: string,
): JobStage {
  const nextStep = given.nextStep === undefined ? set.nextStep : given.nextStep;
  if (nextStep === null) {
    return { ...set, nextStep: null, nextDate: null };
  }
  const nextDate = given.nextDate === undefined ? set.nextDate : given.nextDate;
  return { ...set, ...withStepDate({ nextStep, nextDate }, set, today) };
}
