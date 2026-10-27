import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type {
  IJobsRepository,
  JobRow,
} from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { InputParseError, NotFoundError } from "@/src/entities/errors/common";
import { acceptedStage } from "@/src/entities/job-lifecycle";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import type {
  Job,
  ProposalDecision,
  ReviewState,
} from "@/src/entities/models/job.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IReviewProposalUseCase = ReturnType<typeof reviewProposalUseCase>;

// Where each decision takes a proposal from.
const FROM: Record<ProposalDecision["decision"], ReviewState> = {
  accept: "pending",
  dismiss: "pending",
  reopen: "dismissed",
};

// Hector's call on a proposal (R20), which only he makes (R21): Claude's try is refused, and
// logged, before anything is read. Accepting puts it in the pipeline at verify, with checking it's
// still hiring due today; dismissing keeps it, with the reason, so the posting stays refused as a
// duplicate; reopening puts a dismissed one back in the queue.
export const reviewProposalUseCase = (
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "reviewProposal",
  });

  return async (
    context: ChangeContext,
    decided: ProposalDecision,
  ): Promise<Job> => {
    const { ownerId } = context;
    const record: RecordRef = { kind: "job", id: decided.id };
    await requireHuman(activityRepository, transactionManager, context, {
      record,
      operation: decided.decision,
    });

    const job = await transactionManager.startTransaction(async (tx) => {
      const current = await jobsRepository.getForUpdate(
        ownerId,
        decided.id,
        tx,
      );
      if (!current) {
        throw new NotFoundError("Couldn't find that job.");
      }
      if (current.reviewState !== FROM[decided.decision]) {
        throw new InputParseError(
          `Only a ${FROM[decided.decision]} proposal can be ${PAST[decided.decision]}.`,
        );
      }
      const changes = changesFor(decided, todayIn(PLAN_TIME_ZONE));
      const reviewed = await jobsRepository.update(
        ownerId,
        decided.id,
        changes,
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record,
        action: "updated",
        before: {
          reviewState: current.reviewState,
          status: current.status,
          nextStep: current.nextStep,
          nextDate: current.nextDate,
          dismissReason: current.dismissReason,
          dismissNote: current.dismissNote,
        },
        after: {
          reviewState: reviewed.reviewState,
          status: reviewed.status,
          nextStep: reviewed.nextStep,
          nextDate: reviewed.nextDate,
          dismissReason: reviewed.dismissReason,
          dismissNote: reviewed.dismissNote,
        },
      });
      return reviewed;
    });
    logger.info("Proposal reviewed", {
      jobId: decided.id,
      decision: decided.decision,
    });
    return job;
  };
};

const PAST: Record<ProposalDecision["decision"], string> = {
  accept: "accepted",
  dismiss: "dismissed",
  reopen: "reopened",
};

function changesFor(decided: ProposalDecision, today: string): Partial<JobRow> {
  switch (decided.decision) {
    case "accept":
      return { reviewState: "accepted", ...acceptedStage(today) };
    case "dismiss":
      return {
        reviewState: "dismissed",
        dismissReason: decided.reason,
        dismissNote: decided.note,
      };
    case "reopen":
      return { reviewState: "pending", dismissReason: null, dismissNote: null };
  }
}
