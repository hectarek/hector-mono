import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetLendingUseCase } from "@/src/application/use-cases/copies/set-lending.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z
  .object({
    userGameId: z.uuid(),
    lendable: z.boolean().optional(),
    passAlong: z.boolean().optional(),
  })
  .refine(
    (input) => input.lendable !== undefined || input.passAlong !== undefined,
  );

export type ISetLendingController = ReturnType<typeof setLendingController>;

// One of B7's lending switches, as it flips.
export const setLendingController = (
  useCase: ISetLendingUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "setLending" });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(
      data.userGameId,
      { lendable: data.lendable, passAlong: data.passAlong },
      userId,
    );
  };
};
