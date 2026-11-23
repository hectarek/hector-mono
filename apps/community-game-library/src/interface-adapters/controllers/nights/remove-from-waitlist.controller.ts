import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveFromWaitlistUseCase } from "@/src/application/use-cases/nights/remove-from-waitlist.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  memberId: z.uuid(),
});

export type IRemoveFromWaitlistController = ReturnType<
  typeof removeFromWaitlistController
>;

// Take someone off the waitlist (D7), after its dialog.
export const removeFromWaitlistController = (
  useCase: IRemoveFromWaitlistUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeFromWaitlist",
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
    return useCase(data.gameNightId, data.memberId, userId);
  };
};
