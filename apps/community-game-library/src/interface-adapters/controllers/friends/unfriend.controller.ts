import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUnfriendUseCase } from "@/src/application/use-cases/friends/unfriend.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ friendId: z.uuid() });

export type IUnfriendController = ReturnType<typeof unfriendController>;

// Unfriend (E4), after its dialog.
export const unfriendController = (
  useCase: IUnfriendUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "unfriend" });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.friendId, userId);
  };
};
