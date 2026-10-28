import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ILogInteractionUseCase } from "@/src/application/use-cases/interactions/log-interaction.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type LoggedInteractions,
  logInteractionSchema,
} from "@/src/entities/models/interaction.model";

export type ILogInteractionController = ReturnType<
  typeof logInteractionController
>;

// log_interaction's write, and the quick-log sheet's (docs/build-plan.md KTD4, KTD9).
export const logInteractionController = (
  useCase: ILogInteractionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "logInteraction",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<LoggedInteractions> => {
    const { data, error: parseError } = logInteractionSchema.safeParse(input);
    if (parseError) {
      logger.warn("log_interaction input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid interaction", { cause: parseError });
    }
    return useCase(context, data);
  };
};
