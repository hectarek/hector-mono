import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRenameSpaceUseCase } from "@/src/application/use-cases/spaces/rename-space.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  spaceId: z.uuid(),
  name: z
    .string({ error: "Name is required" })
    .trim()
    .min(1, "Name is required")
    .max(80),
});

export type IRenameSpaceController = ReturnType<typeof renameSpaceController>;

export const renameSpaceController = (
  useCase: IRenameSpaceUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "renameSpace",
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

    return useCase(data.spaceId, data.name, userId);
  };
};
