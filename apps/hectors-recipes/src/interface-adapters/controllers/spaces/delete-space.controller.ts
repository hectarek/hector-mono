import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteSpaceUseCase } from "@/src/application/use-cases/spaces/delete-space.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { SpaceType } from "@/src/entities/models/space.model";

const inputSchema = z.object({
  spaceId: z.uuid(),
});

export type IDeleteSpaceController = ReturnType<typeof deleteSpaceController>;

export const deleteSpaceController = (
  useCase: IDeleteSpaceUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteSpace",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<SpaceType> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.spaceId, userId);
  };
};
