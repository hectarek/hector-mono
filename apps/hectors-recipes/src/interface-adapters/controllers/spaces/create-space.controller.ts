import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateSpaceUseCase } from "@/src/application/use-cases/spaces/create-space.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  createSpaceSchema,
  type Space,
} from "@/src/entities/models/space.model";

const inputSchema = createSpaceSchema;

export type ICreateSpaceController = ReturnType<typeof createSpaceController>;

export const createSpaceController = (
  useCase: ICreateSpaceUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "createSpace",
  });

  return async (input: unknown, userId: string | undefined): Promise<Space> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data, userId);
  };
};
