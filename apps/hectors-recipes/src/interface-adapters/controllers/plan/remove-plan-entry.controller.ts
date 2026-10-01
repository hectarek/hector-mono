import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemovePlanEntryUseCase } from "@/src/application/use-cases/plan/remove-plan-entry.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ entryId: z.uuid() });

export type IRemovePlanEntryController = ReturnType<
  typeof removePlanEntryController
>;

export const removePlanEntryController = (
  useCase: IRemovePlanEntryUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removePlanEntry",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<string> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.entryId, userId);
  };
};
