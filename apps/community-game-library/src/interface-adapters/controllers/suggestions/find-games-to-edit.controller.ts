import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IFindGamesToEditUseCase } from "@/src/application/use-cases/suggestions/find-games-to-edit.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ q: z.string().max(200) });

export type IFindGamesToEditController = ReturnType<
  typeof findGamesToEditController
>;

// G5's search, for the admin.
export const findGamesToEditController = (
  useCase: IFindGamesToEditUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "findGamesToEdit",
  });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.q, userId);
  };
};
