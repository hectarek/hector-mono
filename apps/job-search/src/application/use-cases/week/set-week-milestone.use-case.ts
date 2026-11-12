import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IWeekPlansRepository } from "@/src/application/repositories/week-plans.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { ConflictError, InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type {
  SetWeekMilestoneInput,
  WeekPlan,
} from "@/src/entities/models/weekly-review.model";

export type ISetWeekMilestoneUseCase = ReturnType<
  typeof setWeekMilestoneUseCase
>;

// Sets a week's milestone (R10 as revised 2026-11-10, docs/build-plan.md U20): Hector's on the
// week page or Claude's through set_week_milestone at Monday's planning, logged as whoever set it.
// It fixes no counts or targets: the week's review still fixes those at its first save. Made
// against the updatedAt read with the plan, null before the first (R22). A week with no plan yet
// takes a milestone, not a blank.
export const setWeekMilestoneUseCase = (
  weekPlansRepository: IWeekPlansRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "setWeekMilestone",
  });

  return async (
    context: ChangeContext,
    { week, milestone, updatedAt }: SetWeekMilestoneInput,
  ): Promise<WeekPlan> => {
    const { ownerId } = context;
    const saved = await transactionManager.startTransaction(async (tx) => {
      const current = await weekPlansRepository.getForUpdate(ownerId, week, tx);
      if (current?.updatedAt.getTime() !== updatedAt?.getTime()) {
        throw new ConflictError(current ?? null);
      }
      if (!current) {
        if (milestone === null) {
          throw new InputParseError("Give the week a milestone.");
        }
        const created = await weekPlansRepository.create(
          ownerId,
          { week, milestone },
          tx,
        );
        await recordChange(activityRepository, tx, context, {
          record: { kind: "week-plan", id: created.id },
          action: "created",
          after: { week, milestone },
        });
        return created;
      }
      // Nothing changed: nothing to save or log.
      if (milestone === current.milestone) {
        return current;
      }
      const updated = await weekPlansRepository.update(
        ownerId,
        current.id,
        milestone,
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "week-plan", id: current.id },
        action: "updated",
        before: { milestone: current.milestone },
        after: { milestone: updated.milestone },
      });
      return updated;
    });
    logger.info("Week's milestone set", { planId: saved.id });
    return saved;
  };
};
