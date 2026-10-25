import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IHasMealsUseCase } from "@/src/application/use-cases/plan/has-meals.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ planId: z.uuid() });

export type IHasMealsController = ReturnType<typeof hasMealsController>;

export const hasMealsController = (
  useCase: IHasMealsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "hasMeals",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<boolean> => {
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
