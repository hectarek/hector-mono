import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetTodayUseCase } from "@/src/application/use-cases/week/get-today.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  getTodaySchema,
  type TodayView,
} from "@/src/entities/models/today.model";

export type IGetTodayController = ReturnType<typeof getTodayController>;

// The read behind This week and get_today (docs/build-plan.md KTD4, U9).
export const getTodayController = (
  useCase: IGetTodayUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getToday" });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<TodayView> => {
    const { error: parseError } = getTodaySchema.safeParse(input);
    if (parseError) {
      logger.warn("get_today input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId);
  };
};
