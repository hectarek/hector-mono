import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICancelNightUseCase } from "@/src/application/use-cases/nights/cancel-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { optionalText } from "@/src/interface-adapters/controllers/suggestions/form-fields";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  // D11's Note for them, which may be left empty.
  note: optionalText(500),
});

export type ICancelNightController = ReturnType<typeof cancelNightController>;

// Cancel a night (D11), after its dialog, as of now.
export const cancelNightController = (
  useCase: ICancelNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "cancelNight",
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
    return useCase(data.gameNightId, data.note, userId, new Date());
  };
};
