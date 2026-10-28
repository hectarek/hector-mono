import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetPracticeSessionUseCase } from "@/src/application/use-cases/practice/get-practice-session.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type PracticeSession,
  practiceEntryIdSchema,
} from "@/src/entities/models/practice-entry.model";

export type IGetPracticeSessionController = ReturnType<
  typeof getPracticeSessionController
>;

// The read behind a practice session's page (docs/build-plan.md U8).
export const getPracticeSessionController = (
  useCase: IGetPracticeSessionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getPracticeSession",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<PracticeSession> => {
    const { data, error: parseError } = practiceEntryIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Get practice session input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
