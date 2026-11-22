import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IGetProfileUseCase,
  ProfileView,
} from "@/src/application/use-cases/profile/get-profile.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ userId: z.uuid() });

export type IGetProfileController = ReturnType<typeof getProfileController>;

// Whose profile to read, and who's reading: the viewer is the signed-in member.
export const getProfileController = (
  useCase: IGetProfileUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getProfile",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<ProfileView> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.userId, userId);
  };
};
