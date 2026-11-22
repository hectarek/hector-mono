import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { photoSchema } from "@/src/entities/profile-photo";

// The type and size are checked again, after the phone shrank the picture (KTD11).
const inputSchema = z.object({ photo: photoSchema });

export type ISetPhotoController = ReturnType<typeof setPhotoController>;

export const setPhotoController = (
  useCase: ISetPhotoUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setPhoto",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.photo, userId);
  };
};
