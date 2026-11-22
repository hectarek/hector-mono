import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetPhotoUseCase } from "@/src/application/use-cases/profile/set-photo.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  MAX_PHOTO_BYTES,
  PHOTO_FAILED_LINE,
  PHOTO_TYPES,
} from "@/src/entities/profile-photo";

// The action checks the type and size again, after the phone shrank the picture (KTD11).
const inputSchema = z.object({
  photo: z.object({
    contentType: z.enum(PHOTO_TYPES, PHOTO_FAILED_LINE),
    bytes: z
      .instanceof(Uint8Array)
      .refine(
        (bytes) => bytes.byteLength > 0 && bytes.byteLength <= MAX_PHOTO_BYTES,
        PHOTO_FAILED_LINE,
      ),
  }),
});

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
