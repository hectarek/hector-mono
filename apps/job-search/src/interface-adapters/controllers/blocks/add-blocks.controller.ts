import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddBlocksUseCase } from "@/src/application/use-cases/blocks/add-blocks.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { addBlocksSchema, type Block } from "@/src/entities/models/block.model";

export type IAddBlocksController = ReturnType<typeof addBlocksController>;

// add_blocks' write, and the block form's (docs/build-plan.md KTD4, U17).
export const addBlocksController = (
  useCase: IAddBlocksUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addBlocks",
  });

  return async (input: unknown, context: ChangeContext): Promise<Block[]> => {
    const { data, error: parseError } = addBlocksSchema.safeParse(input);
    if (parseError) {
      logger.warn("add_blocks input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid blocks", { cause: parseError });
    }
    return useCase(context, data);
  };
};
