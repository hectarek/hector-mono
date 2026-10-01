import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListMealsToAddUseCase } from "@/src/application/use-cases/grocery/list-meals-to-add.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ planId: z.uuid() });

export type IListMealsToAddController = ReturnType<
  typeof listMealsToAddController
>;

export const listMealsToAddController = (
  useCase: IListMealsToAddUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listMealsToAdd",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<string[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.planId, userId, todayIn(PLAN_TIME_ZONE));
  };
};
