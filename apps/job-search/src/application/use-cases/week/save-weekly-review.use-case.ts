import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { IWeeklyReviewsRepository } from "@/src/application/repositories/weekly-reviews.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { weekCounts } from "@/src/application/use-cases/week/week-counts";
import { ConflictError, InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import {
  type SaveWeeklyReviewInput,
  type WeeklyReview,
  weeklyReviewLogged,
} from "@/src/entities/models/weekly-review.model";
import { mondayOf, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type ISaveWeeklyReviewUseCase = ReturnType<
  typeof saveWeeklyReviewUseCase
>;

// Saves a week's review (R10, docs/build-plan.md U9), Hector's on the week page or Claude's
// through save_weekly_review, logged as whoever saved it. The first save fixes the week's counts
// and the targets as they are then; a later one changes only the milestone and the change it
// gives. Each is made against the updatedAt read with the review, null before the first (R22). A
// week that hasn't started can't be reviewed.
export const saveWeeklyReviewUseCase = (
  weeklyReviewsRepository: IWeeklyReviewsRepository,
  jobsRepository: IJobsRepository,
  interactionsRepository: IInteractionsRepository,
  practiceRepository: IPracticeRepository,
  settingsRepository: ISettingsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "saveWeeklyReview",
  });

  return async (
    context: ChangeContext,
    { week, updatedAt, milestone, change }: SaveWeeklyReviewInput,
  ): Promise<WeeklyReview> => {
    const { ownerId } = context;
    if (week > mondayOf(todayIn(PLAN_TIME_ZONE))) {
      throw new InputParseError("A week can be reviewed once it has started.");
    }
    // The snapshot a first save keeps, read before its transaction: the counts read outside it.
    const [counts, settings] = await Promise.all([
      weekCounts(
        {
          jobs: jobsRepository,
          interactions: interactionsRepository,
          practice: practiceRepository,
        },
        ownerId,
        week,
      ),
      settingsRepository.get(ownerId),
    ]);

    const saved = await transactionManager.startTransaction(async (tx) => {
      const current = await weeklyReviewsRepository.getForUpdate(
        ownerId,
        week,
        tx,
      );
      if (current?.updatedAt.getTime() !== updatedAt?.getTime()) {
        throw new ConflictError(current ?? null);
      }
      if (!current) {
        const created = await weeklyReviewsRepository.create(
          ownerId,
          {
            week,
            counts,
            targets: (settings ?? DEFAULT_SETTINGS).targets,
            milestone: milestone ?? null,
            change: change ?? null,
            author: context.actor,
          },
          tx,
        );
        await recordChange(activityRepository, tx, context, {
          record: { kind: "weekly-review", id: created.id },
          action: "created",
          after: weeklyReviewLogged(created),
        });
        return created;
      }
      const changes = {
        ...(milestone !== undefined && { milestone }),
        ...(change !== undefined && { change }),
      };
      // Nothing changed: nothing to save or log.
      if (
        (changes.milestone === undefined ||
          changes.milestone === current.milestone) &&
        (changes.change === undefined || changes.change === current.change)
      ) {
        return current;
      }
      const updated = await weeklyReviewsRepository.update(
        ownerId,
        current.id,
        changes,
        tx,
      );
      await recordChange(activityRepository, tx, context, {
        record: { kind: "weekly-review", id: current.id },
        action: "updated",
        before: { milestone: current.milestone, change: current.change },
        after: { milestone: updated.milestone, change: updated.change },
      });
      return updated;
    });
    logger.info("Weekly review saved", { reviewId: saved.id });
    return saved;
  };
};
