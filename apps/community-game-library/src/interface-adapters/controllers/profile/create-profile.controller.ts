import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateProfileUseCase } from "@/src/application/use-cases/profile/create-profile.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  profileFormSchema,
  type UserProfile,
} from "@/src/entities/models/user-profile.model";

export type ICreateProfileController = ReturnType<
  typeof createProfileController
>;

export const createProfileController = (
  useCase: ICreateProfileUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "createProfile",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<UserProfile> => {
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
