import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListMySpacesUseCase } from "@/src/application/use-cases/spaces/list-my-spaces.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  type SpaceWithRole,
  spaceTypeSchema,
} from "@/src/entities/models/space.model";

const inputSchema = z.object({
  type: spaceTypeSchema,
});

export type IListMySpacesController = ReturnType<typeof listMySpacesController>;

export const listMySpacesController = (
  useCase: IListMySpacesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listMySpaces",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<SpaceWithRole[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(userId, data.type);
  };
};
