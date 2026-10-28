import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ILogPracticeUseCase } from "@/src/application/use-cases/practice/log-practice.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type LoggedPractice,
  logPracticeSchema,
} from "@/src/entities/models/practice-entry.model";

export type ILogPracticeController = ReturnType<typeof logPracticeController>;

// log_practice's write, and the practice page's forms (docs/build-plan.md KTD4, U8).
export const logPracticeController = (
  useCase: ILogPracticeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "logPractice",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<LoggedPractice> => {
    const { data, error: parseError } = logPracticeSchema.safeParse(input);
    if (parseError) {
      logger.warn("log_practice input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid practice", { cause: parseError });
    }
    return useCase(context, data);
  };
};
