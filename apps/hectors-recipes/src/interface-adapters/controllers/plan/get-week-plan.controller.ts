import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetWeekPlanUseCase } from "@/src/application/use-cases/plan/get-week-plan.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  isoDateSchema,
  type PlanEntry,
} from "@/src/entities/models/plan-entry.model";
import { mondayOf } from "@/src/entities/week";

const inputSchema = z.object({ spaceId: z.uuid(), date: isoDateSchema });

export type IGetWeekPlanController = ReturnType<typeof getWeekPlanController>;

export const getWeekPlanController = (
  useCase: IGetWeekPlanUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getWeekPlan",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<PlanEntry[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.spaceId, mondayOf(data.date), userId);
  };
};
