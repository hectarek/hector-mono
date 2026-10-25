import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IClearMealPlanUseCase } from "@/src/application/use-cases/plan/clear-meal-plan.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ planId: z.uuid() });

export type IClearMealPlanController = ReturnType<
  typeof clearMealPlanController
>;

export const clearMealPlanController = (
  useCase: IClearMealPlanUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "clearMealPlan",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<number> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.planId, userId);
  };
};
