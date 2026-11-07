import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteBlockUseCase } from "@/src/application/use-cases/blocks/delete-block.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  blockIdSchema,
  type DeletedBlock,
} from "@/src/entities/models/block.model";

export type IDeleteBlockController = ReturnType<typeof deleteBlockController>;

// Deleting a block, from its page: human-only (R21), so no page tool calls it.
export const deleteBlockController = (
  useCase: IDeleteBlockUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteBlock",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<DeletedBlock> => {
    const { data, error: parseError } = blockIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete block input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
