import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddItemUseCase } from "@/src/application/use-cases/stash-items/add-item.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { StashItem } from "@/src/entities/models/stash-item.model";

const inputSchema = z.object({
  url: z.url(),
  title: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(["video", "article", "movie", "podcast", "other"]).optional(),
  thumbnailUrl: z.url().optional(),
  source: z.string().optional(),
});

export type IAddItemController = ReturnType<typeof addItemController>;

export const addItemController = (
  addItemUseCase: IAddItemUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addItem",
  });

  return async (
    input: Partial<z.infer<typeof inputSchema>>,
    userId: string | undefined,
  ): Promise<StashItem> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to add items");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);

    if (parseError) {
      logger.warn("Input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return addItemUseCase(data, userId);
  };
};
