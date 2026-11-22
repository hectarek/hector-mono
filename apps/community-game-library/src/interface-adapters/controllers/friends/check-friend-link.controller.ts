import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICheckFriendLinkUseCase } from "@/src/application/use-cases/friends/check-friend-link.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import { linkTokenOf } from "@/src/entities/link-token";

const inputSchema = z.object({ token: z.string() });

export type ICheckFriendLinkController = ReturnType<
  typeof checkFriendLinkController
>;

// A3's read for a signed-out visitor: the token's form first, before any read (KTD4).
export const checkFriendLinkController = (
  useCase: ICheckFriendLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "checkFriendLink",
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
    return useCase(token, new Date());
  };
};
