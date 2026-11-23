import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IOpenNightLinkUseCase } from "@/src/application/use-cases/nights/open-night-link.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { linkTokenOf } from "@/src/entities/link-token";

const inputSchema = z.object({ token: z.string() });

export type IOpenNightLinkController = ReturnType<
  typeof openNightLinkController
>;

// A night's link opened signed in (KTD18): the token's form first, before any read (KTD4).
export const openNightLinkController = (
  useCase: IOpenNightLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "openNightLink",
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
    const token = linkTokenOf(data.token);
    if (!token) {
      throw new InputParseError("Not a link's token");
    }
    return useCase(token, userId);
  };
};
