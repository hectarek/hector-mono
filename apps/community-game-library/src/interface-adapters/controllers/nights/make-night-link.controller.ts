import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IMakeNightLinkUseCase } from "@/src/application/use-cases/nights/make-night-link.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ gameNightId: z.uuid() });

export type IMakeNightLinkController = ReturnType<
  typeof makeNightLinkController
>;

// Make a new link (D7), after its dialog.
export const makeNightLinkController = (
  useCase: IMakeNightLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "makeNightLink",
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
    return useCase(data.gameNightId, userId);
  };
};
