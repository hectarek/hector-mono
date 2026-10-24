import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import {
  type ActivityPage,
  listActivitySchema,
} from "@/src/entities/models/activity.model";
import type { CurrentActor } from "@/src/entities/models/actor.model";

export type IListActivityController = ReturnType<typeof listActivityController>;

// The one read behind a record's history and list_activity (docs/build-plan.md KTD4). Who is
// acting is already settled: the page or action asked the session first.
export const listActivityController = (
  useCase: IListActivityUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listActivity",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<ActivityPage> => {
    const { data, error: parseError } = listActivitySchema.safeParse(input);
    if (parseError) {
      logger.warn("Activity filter validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid activity filter", {
        cause: parseError,
      });
    }
    return useCase(ownerId, data);
  };
};
