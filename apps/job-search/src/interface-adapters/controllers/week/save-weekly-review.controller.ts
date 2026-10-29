import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISaveWeeklyReviewUseCase } from "@/src/application/use-cases/week/save-weekly-review.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  saveWeeklyReviewSchema,
  type WeeklyReview,
} from "@/src/entities/models/weekly-review.model";

export type ISaveWeeklyReviewController = ReturnType<
  typeof saveWeeklyReviewController
>;

// The week page's save and save_weekly_review (docs/build-plan.md KTD4, U9).
export const saveWeeklyReviewController = (
  useCase: ISaveWeeklyReviewUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "saveWeeklyReview",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<WeeklyReview> => {
    const { data, error: parseError } = saveWeeklyReviewSchema.safeParse(input);
    if (parseError) {
      logger.warn("save_weekly_review input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
