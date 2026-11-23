import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListNightsUseCase } from "@/src/application/use-cases/nights/list-nights.use-case";
import type { NightCard } from "@/src/application/use-cases/nights/night-cards";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ goingUserId: z.uuid().optional() });

export type IListNightsController = ReturnType<typeof listNightsController>;

// Nights (D1) for the signed-in member, or a friend's page's nights (E3), as of now.
export const listNightsController = (
  useCase: IListNightsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "listNights" });

  return async (
    userId: string | undefined,
    input: unknown = {},
  ): Promise<NightCard[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(userId, new Date(), data);
  };
};
