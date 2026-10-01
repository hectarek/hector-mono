import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddPlanToListUseCase } from "@/src/application/use-cases/grocery/add-plan-to-list.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  type AddToListResult,
  addPlanToListSchema,
} from "@/src/entities/models/grocery-item.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IAddPlanToListController = ReturnType<
  typeof addPlanToListController
>;

export const addPlanToListController = (
  useCase: IAddPlanToListUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addPlanToList",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<AddToListResult> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = addPlanToListSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    // Today in the plan's time zone, from the server's clock, never the phone's.
    return useCase(data.planId, userId, {
      entryId: data.entryId,
      range: data.range,
      again: data.again,
      today: todayIn(PLAN_TIME_ZONE),
    });
  };
};
