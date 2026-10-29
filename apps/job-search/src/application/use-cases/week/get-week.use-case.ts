import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPracticeRepository } from "@/src/application/repositories/practice.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { IWeeklyReviewsRepository } from "@/src/application/repositories/weekly-reviews.repository.interface";
import { weekCounts } from "@/src/application/use-cases/week/week-counts";
import { DEFAULT_SETTINGS } from "@/src/entities/models/settings.model";
import type {
  WeekQuery,
  WeekView,
} from "@/src/entities/models/weekly-review.model";
import {
  addDays,
  mondayOf,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

export type IGetWeekUseCase = ReturnType<typeof getWeekUseCase>;

// The week page and get_week (docs/build-plan.md U9, R10): a week's counts now and today's
// targets, beside the review saved for it, whose snapshot they may no longer match. This week
// unless the query names another, by its Monday.
export const getWeekUseCase =
  (
    jobsRepository: IJobsRepository,
    interactionsRepository: IInteractionsRepository,
    practiceRepository: IPracticeRepository,
    settingsRepository: ISettingsRepository,
    weeklyReviewsRepository: IWeeklyReviewsRepository,
  ) =>
  async (ownerId: string, { week }: WeekQuery): Promise<WeekView> => {
    const thisWeek = mondayOf(todayIn(PLAN_TIME_ZONE));
    const monday = week ?? thisWeek;
    const [counts, settings, review] = await Promise.all([
      weekCounts(
        {
          jobs: jobsRepository,
          interactions: interactionsRepository,
          practice: practiceRepository,
        },
        ownerId,
        monday,
      ),
      settingsRepository.get(ownerId),
      weeklyReviewsRepository.get(ownerId, monday),
    ]);
    return {
      week: monday,
      counts,
      targets: (settings ?? DEFAULT_SETTINGS).targets,
      review: review ?? null,
      previous: addDays(monday, -7),
      next: monday < thisWeek ? addDays(monday, 7) : null,
    };
  };
