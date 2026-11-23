import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetNightUseCase,
  NightPage,
} from "@/src/application/use-cases/nights/get-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ gameNightId: z.uuid() });

export type IGetNightController = ReturnType<typeof getNightController>;

// A night's page for the signed-in member. A malformed id is Not found's twin, InputParseError.
export const getNightController = (
  useCase: IGetNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getNight" });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<NightPage> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.gameNightId, userId);
  };
};
