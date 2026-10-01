import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGrantPlanSubscriptionUseCase } from "@/src/application/use-cases/realtime/grant-plan-subscription.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { RealtimeGrant } from "@/src/entities/realtime";

const inputSchema = z.object({ planId: z.uuid() });

export type IGrantPlanSubscriptionController = ReturnType<
  typeof grantPlanSubscriptionController
>;

export const grantPlanSubscriptionController = (
  useCase: IGrantPlanSubscriptionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "grantPlanSubscription",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<RealtimeGrant> => {
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
