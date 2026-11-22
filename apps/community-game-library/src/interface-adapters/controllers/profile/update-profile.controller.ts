import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateProfileUseCase } from "@/src/application/use-cases/profile/update-profile.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { profileFormSchema } from "@/src/entities/models/user-profile.model";

export type IUpdateProfileController = ReturnType<
  typeof updateProfileController
>;

export const updateProfileController = (
  useCase: IUpdateProfileUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateProfile",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = profileFormSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data, userId);
  };
};
