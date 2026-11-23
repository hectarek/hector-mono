import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICheckNightLinkUseCase } from "@/src/application/use-cases/nights/check-night-link.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import { linkTokenOf } from "@/src/entities/link-token";

const inputSchema = z.object({ token: z.string() });

export type ICheckNightLinkController = ReturnType<
  typeof checkNightLinkController
>;

// D14's read for a signed-out visitor: the token's form first, before any read (KTD4).
export const checkNightLinkController = (
  useCase: ICheckNightLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "checkNightLink",
  });

  return async (input: unknown) => {
    logger.debug("Validating input");
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    const token = linkTokenOf(data.token);
    if (!token) {
      throw new InputParseError("Not a link's token");
    }
    return useCase(token);
  };
};
