import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetEntryCookedUseCase } from "@/src/application/use-cases/plan/set-entry-cooked.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ entryId: z.uuid(), cooked: z.boolean() });

export type ISetEntryCookedController = ReturnType<
  typeof setEntryCookedController
>;

export const setEntryCookedController = (
  useCase: ISetEntryCookedUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setEntryCooked",
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

    return useCase(data.entryId, data.cooked, userId);
  };
};
