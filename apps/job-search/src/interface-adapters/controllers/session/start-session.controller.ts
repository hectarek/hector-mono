import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IStartSessionUseCase } from "@/src/application/use-cases/session/start-session.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type SessionStart,
  startSessionSchema,
} from "@/src/entities/models/agent-session.model";

export type IStartSessionController = ReturnType<typeof startSessionController>;

// start_session's write (docs/build-plan.md KTD4): who is acting, and the tool, are already
// settled by the action.
export const startSessionController = (
  useCase: IStartSessionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "startSession",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<SessionStart> => {
    const { data, error: parseError } = startSessionSchema.safeParse(input);
    if (parseError) {
      logger.warn("start_session input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
