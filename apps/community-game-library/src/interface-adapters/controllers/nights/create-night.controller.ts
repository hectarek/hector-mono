import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateNightUseCase } from "@/src/application/use-cases/nights/create-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  detailsOf,
  nightDetails,
  nightSwitches,
} from "@/src/interface-adapters/controllers/nights/night-fields";

// D5's form, with the games picked from the host's library (D6) in the order they were picked.
const inputSchema = z.strictObject({
  ...nightDetails,
  ...nightSwitches,
  userGameIds: z.array(z.uuid()).max(100),
});

export type ICreateNightController = ReturnType<typeof createNightController>;

// Create a game night (D5), from now on.
export const createNightController = (
  useCase: ICreateNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "createNight",
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
    const { attendeesCanInvite, guestsAllowed, userGameIds, ...details } = data;
    return useCase(
      {
        ...detailsOf(details),
        attendeesCanInvite,
        guestsAllowed,
        userGameIds,
      },
      userId,
      new Date(),
    );
  };
};
