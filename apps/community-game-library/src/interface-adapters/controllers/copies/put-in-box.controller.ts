import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IPutInBoxUseCase } from "@/src/application/use-cases/copies/put-in-box.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ gameId: z.uuid() });

export type IPutInBoxController = ReturnType<typeof putInBoxController>;

// In my box, for the signed-in member.
export const putInBoxController = (
  useCase: IPutInBoxUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "putInBox" });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.gameId, userId);
  };
};
