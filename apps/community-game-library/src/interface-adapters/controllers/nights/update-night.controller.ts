import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateNightUseCase } from "@/src/application/use-cases/nights/update-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { GameNightChanges } from "@/src/entities/models/game-night.model";
import {
  detailsOf,
  nightDetails,
  nightSwitches,
} from "@/src/interface-adapters/controllers/nights/night-fields";

const gameNightId = z.uuid();

// Edit's Save sends the details; each switch sends itself as it's flipped (rule 4).
const inputSchema = z.union([
  z.strictObject({ gameNightId, ...nightDetails }),
  z.strictObject({
    gameNightId,
    attendeesCanInvite: nightSwitches.attendeesCanInvite,
  }),
  z.strictObject({ gameNightId, guestsAllowed: nightSwitches.guestsAllowed }),
]);

export type IUpdateNightController = ReturnType<typeof updateNightController>;

// The host's Edit (from D7), from now on.
export const updateNightController = (
  useCase: IUpdateNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateNight",
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
    const changes: GameNightChanges =
      "name" in data
        ? detailsOf(data)
        : "attendeesCanInvite" in data
          ? { attendeesCanInvite: data.attendeesCanInvite }
          : { guestsAllowed: data.guestsAllowed };
    return useCase(data.gameNightId, changes, userId, new Date());
  };
};
