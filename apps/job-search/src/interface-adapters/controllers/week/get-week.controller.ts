import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetWeekUseCase } from "@/src/application/use-cases/week/get-week.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  getWeekSchema,
  type WeekView,
} from "@/src/entities/models/weekly-review.model";

export type IGetWeekController = ReturnType<typeof getWeekController>;

// The read behind the week page and get_week (docs/build-plan.md KTD4, U9).
export const getWeekController = (
  useCase: IGetWeekUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getWeek" });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<WeekView> => {
    const { data, error: parseError } = getWeekSchema.safeParse(input);
    if (parseError) {
      logger.warn("get_week input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
