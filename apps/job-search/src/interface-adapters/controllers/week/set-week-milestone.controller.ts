import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetWeekMilestoneUseCase } from "@/src/application/use-cases/week/set-week-milestone.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  setWeekMilestoneSchema,
  type WeekPlan,
} from "@/src/entities/models/weekly-review.model";

export type ISetWeekMilestoneController = ReturnType<
  typeof setWeekMilestoneController
>;

// The week page's milestone and set_week_milestone (docs/build-plan.md KTD4, U20).
export const setWeekMilestoneController = (
  useCase: ISetWeekMilestoneUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setWeekMilestone",
  });

  return async (input: unknown, context: ChangeContext): Promise<WeekPlan> => {
    const { data, error: parseError } = setWeekMilestoneSchema.safeParse(input);
    if (parseError) {
      logger.warn("set_week_milestone input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
